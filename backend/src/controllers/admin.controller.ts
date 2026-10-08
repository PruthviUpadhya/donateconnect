import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ComplaintStatus, NgoVerificationStatus, UserStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

// Validation Schemas
export const verifyNgoSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const resolveComplaintSchema = z.object({
  resolution: z.string().min(5, "Resolution description is required"),
  status: z.enum(["IN_REVIEW", "RESOLVED", "DISMISSED"]).default("RESOLVED"),
});

// Helper: Create audit log
async function createAuditLog(actorId: string, action: string, entityType: string, entityId: string, meta?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}

/**
 * 1. ADMIN PLATFORM STATISTICS & TRENDS
 * GET /api/v1/admin/stats
 */
export const getAdminStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalNgos,
      pendingNgos,
      approvedNgos,
      totalVolunteers,
      totalDonations,
      deliveredDonations,
      openComplaints,
      fraudFlagsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "DONOR" } }),
      prisma.ngo.count(),
      prisma.ngo.count({ where: { verificationStatus: "PENDING" } }),
      prisma.ngo.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.user.count({ where: { role: "VOLUNTEER" } }),
      prisma.donation.count(),
      prisma.donation.count({ where: { status: "DELIVERED" } }),
      prisma.complaint.count({ where: { status: "OPEN" } }),
      prisma.fraudFlag.count({ where: { status: "FLAGGED" } }),
    ]);

    // Aggregate inventory quantity across all NGOs
    const inventorySum = await prisma.inventoryItem.aggregate({
      _sum: { quantity: true },
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          donors: totalDonors,
          volunteers: totalVolunteers,
        },
        ngos: {
          total: totalNgos,
          pending: pendingNgos,
          approved: approvedNgos,
        },
        donations: {
          total: totalDonations,
          delivered: deliveredDonations,
          activeStockUnits: inventorySum._sum.quantity || 0,
        },
        governance: {
          openComplaints,
          fraudFlagsCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. NGO VERIFICATION QUEUE
 * GET /api/v1/admin/ngos/pending
 * POST /api/v1/admin/ngos/:id/verify
 */
export const getPendingNgos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pendingNgos = await prisma.ngo.findMany({
      where: { verificationStatus: NgoVerificationStatus.PENDING },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      success: true,
      data: { ngos: pendingNgos },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyNgo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = verifyNgoSchema.parse(req.body);
    const adminId = req.user!.userId;

    const ngo = await prisma.ngo.findUnique({
      where: { id: ngoId },
      include: { owner: true },
    });

    if (!ngo) {
      throw new AppError({
        statusCode: 404,
        code: "NGO_NOT_FOUND",
        message: "NGO not found",
      });
    }

    const nextStatus = data.action === "APPROVE" ? NgoVerificationStatus.APPROVED : NgoVerificationStatus.REJECTED;

    const updatedNgo = await prisma.ngo.update({
      where: { id: ngo.id },
      data: {
        verificationStatus: nextStatus,
        verifiedById: adminId,
        verifiedAt: new Date(),
        rejectionReason: data.action === "REJECT" ? data.rejectionReason : null,
      },
    });

    // Write audit log
    await createAuditLog(
      adminId,
      data.action === "APPROVE" ? "NGO_APPROVED" : "NGO_REJECTED",
      "NGO",
      ngo.id,
      { action: data.action, reason: data.rejectionReason }
    );

    res.status(200).json({
      success: true,
      message: `NGO verification status updated to ${nextStatus}`,
      data: { ngo: updatedNgo },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. USER MANAGEMENT
 * GET /api/v1/admin/users
 * PATCH /api/v1/admin/users/:id/status
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
        ownedNgo: { select: { id: true, name: true, verificationStatus: true } },
        volunteerProfile: { select: { id: true, tasksCompleted: true, ratingAvg: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = updateUserStatusSchema.parse(req.body);
    const adminId = req.user!.userId;

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { status: data.status as UserStatus },
    });

    await createAuditLog(adminId, `USER_${data.status}`, "USER", user.id);

    res.status(200).json({
      success: true,
      message: `User status changed to ${data.status}`,
      data: { user: { id: user.id, email: user.email, status: user.status } },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. DONATION MONITORING
 * GET /api/v1/admin/donations
 */
export const getAllDonationsForAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donations = await prisma.donation.findMany({
      include: {
        donor: { select: { id: true, name: true, email: true } },
        category: true,
        acceptedByNgo: { select: { id: true, name: true } },
        assignments: {
          include: { volunteer: { include: { user: { select: { name: true } } } } },
        },
        receipt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: { donations },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. COMPLAINTS MANAGEMENT
 * GET /api/v1/admin/complaints
 * POST /api/v1/admin/complaints/:id/resolve
 */
export const getAllComplaints = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const complaints = await prisma.complaint.findMany({
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        targetNgo: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { complaints },
    });
  } catch (err) {
    next(err);
  }
};

export const resolveComplaint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const complaintId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = resolveComplaintSchema.parse(req.body);
    const adminId = req.user!.userId;

    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        resolution: data.resolution,
        status: data.status as ComplaintStatus,
        handledById: adminId,
      },
    });

    await createAuditLog(adminId, "COMPLAINT_RESOLVED", "COMPLAINT", complaint.id, {
      resolution: data.resolution,
      status: data.status,
    });

    res.status(200).json({
      success: true,
      message: "Complaint resolution recorded",
      data: { complaint },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. PLATFORM AUDIT LOGS
 * GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.status(200).json({
      success: true,
      data: { logs },
    });
  } catch (err) {
    next(err);
  }
};
