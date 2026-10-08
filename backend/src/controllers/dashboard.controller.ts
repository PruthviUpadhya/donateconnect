import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { BeneficiaryRequestStatus, ComplaintStatus, RequestUrgency, UserStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";

// Validation Schemas
export const createBeneficiaryRequestSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  categoryId: z.string().uuid("Invalid category UUID"),
  quantityNeeded: z.number().positive("Quantity needed must be positive"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

export const matchDonationSchema = z.object({
  beneficiaryRequestId: z.string().uuid("Invalid request UUID"),
  inventoryItemId: z.string().uuid("Invalid inventory item UUID").optional(),
  donationId: z.string().uuid("Invalid donation UUID").optional(),
  quantity: z.number().positive("Matched quantity must be positive"),
});

export const createComplaintSchema = z.object({
  subject: z.string().min(3, "Subject is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  targetUserId: z.string().uuid().optional(),
  targetNgoId: z.string().uuid().optional(),
  donationId: z.string().uuid().optional(),
});

// Helper: Resolve NGO for user
async function resolveUserNgo(userId: string) {
  const ngo = await prisma.ngo.findFirst({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  if (!ngo) {
    throw new AppError({
      statusCode: 404,
      code: "NGO_NOT_FOUND",
      message: "NGO profile not found for this user",
    });
  }
  return ngo;
}

/**
 * 1. DONOR DASHBOARD METRICS
 * GET /api/v1/donor/dashboard
 */
export const getDonorDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donorId = req.user!.userId;

    const [totalDonations, donations, deliveredCount] = await Promise.all([
      prisma.donation.count({ where: { donorId } }),
      prisma.donation.findMany({
        where: { donorId },
        include: {
          category: true,
          images: true,
          acceptedByNgo: { select: { id: true, name: true, officialEmail: true } },
          receipt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.donation.count({ where: { donorId, status: "DELIVERED" } }),
    ]);

    // Calculate total items donated and distinct NGOs supported
    const totalItems = donations.reduce((acc, d) => acc + d.quantity, 0);
    const ngosSupported = new Set(donations.map((d) => d.acceptedByNgoId).filter(Boolean)).size;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalDonations,
          totalItems,
          ngosSupported,
          deliveredCount,
        },
        donations,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. NGO REPORT & PERFORMANCE METRICS
 * GET /api/v1/ngo/reports
 */
export const getNgoReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);

    const [acceptedCount, deliveredCount, inventoryCount, volunteersCount, requestsCount] = await Promise.all([
      prisma.donation.count({ where: { acceptedByNgoId: ngo.id } }),
      prisma.donation.count({ where: { acceptedByNgoId: ngo.id, status: "DELIVERED" } }),
      prisma.inventoryItem.count({ where: { ngoId: ngo.id } }),
      prisma.ngoVolunteer.count({ where: { ngoId: ngo.id, status: "ACTIVE" } }),
      prisma.beneficiaryRequest.count({ where: { ngoId: ngo.id } }),
    ]);

    const inventoryStock = await prisma.inventoryItem.findMany({
      where: { ngoId: ngo.id },
      include: { category: true },
    });

    res.status(200).json({
      success: true,
      data: {
        ngo: {
          id: ngo.id,
          name: ngo.name,
        },
        metrics: {
          totalAccepted: acceptedCount,
          totalDelivered: deliveredCount,
          activeInventoryBatches: inventoryCount,
          activeVolunteers: volunteersCount,
          beneficiaryRequests: requestsCount,
        },
        inventoryStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. BENEFICIARY REQUESTS (NGO)
 * GET /api/v1/ngo/requests
 * POST /api/v1/ngo/requests
 */
export const getNgoBeneficiaryRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);

    const requests = await prisma.beneficiaryRequest.findMany({
      where: { ngoId: ngo.id },
      include: {
        category: true,
        matches: {
          include: {
            inventoryItem: true,
            donation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { requests },
    });
  } catch (err) {
    next(err);
  }
};

export const createBeneficiaryRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);
    const data = createBeneficiaryRequestSchema.parse(req.body);

    const newRequest = await prisma.beneficiaryRequest.create({
      data: {
        ngoId: ngo.id,
        title: data.title,
        categoryId: data.categoryId,
        quantityNeeded: data.quantityNeeded,
        urgency: data.urgency as RequestUrgency,
        status: BeneficiaryRequestStatus.OPEN,
      },
      include: { category: true },
    });

    res.status(201).json({
      success: true,
      message: "Beneficiary request published successfully",
      data: { request: newRequest },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. DONATION MATCHING (Allocate inventory or donation to beneficiary request)
 * POST /api/v1/ngo/matches
 */
export const matchDonationToRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);
    const data = matchDonationSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const bRequest = await tx.beneficiaryRequest.findUnique({
        where: { id: data.beneficiaryRequestId },
      });

      if (!bRequest || bRequest.ngoId !== ngo.id) {
        throw new AppError({
          statusCode: 404,
          code: "REQUEST_NOT_FOUND",
          message: "Beneficiary request not found for your NGO",
        });
      }

      // Deduct inventory if matched against inventory
      if (data.inventoryItemId) {
        const item = await tx.inventoryItem.findUnique({ where: { id: data.inventoryItemId } });
        if (!item || item.ngoId !== ngo.id) {
          throw new AppError({
            statusCode: 404,
            code: "INVENTORY_NOT_FOUND",
            message: "Inventory item not found",
          });
        }
        if (item.quantity < data.quantity) {
          throw new AppError({
            statusCode: 400,
            code: "INSUFFICIENT_INVENTORY",
            message: `Available stock is only ${item.quantity} ${item.unit}`,
          });
        }

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity - data.quantity },
        });
      }

      // Record match
      const match = await tx.donationMatch.create({
        data: {
          beneficiaryRequestId: bRequest.id,
          inventoryItemId: data.inventoryItemId,
          donationId: data.donationId,
          quantity: data.quantity,
        },
      });

      // Update fulfilled quantity
      const newFulfilled = bRequest.quantityFulfilled + data.quantity;
      const isFulfilled = newFulfilled >= bRequest.quantityNeeded;

      const updatedRequest = await tx.beneficiaryRequest.update({
        where: { id: bRequest.id },
        data: {
          quantityFulfilled: newFulfilled,
          status: isFulfilled ? BeneficiaryRequestStatus.FULFILLED : BeneficiaryRequestStatus.PARTIALLY_FULFILLED,
        },
      });

      return { match, request: updatedRequest };
    });

    res.status(200).json({
      success: true,
      message: "Matched goods allocated to beneficiary request",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. COMPLAINTS & FEEDBACK
 * POST /api/v1/complaints
 * GET /api/v1/complaints/mine
 */
export const createComplaint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createComplaintSchema.parse(req.body);
    const userId = req.user!.userId;

    const complaint = await prisma.complaint.create({
      data: {
        raisedById: userId,
        subject: data.subject,
        description: data.description,
        targetUserId: data.targetUserId,
        targetNgoId: data.targetNgoId,
        donationId: data.donationId,
        status: ComplaintStatus.OPEN,
      },
    });

    res.status(201).json({
      success: true,
      message: "Complaint logged for platform review",
      data: { complaint },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyComplaints = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const complaints = await prisma.complaint.findMany({
      where: { raisedById: userId },
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
