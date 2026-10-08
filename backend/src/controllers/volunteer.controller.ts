import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AssignmentStatus, DonationStatus, Role } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { DonationStateMachine } from "../services/donation-state-machine.service";
import { createNotification } from "../services/notification.service";

// Validation Schemas
export const assignVolunteerSchema = z.object({
  volunteerId: z.string().uuid("Invalid volunteer UUID"),
  deliveryAddressSnap: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAvailabilitySchema = z.object({
  availability: z.boolean(),
  vehicleType: z.string().optional(),
});

export const completeDeliverySchema = z.object({
  proofPhotoUrl: z.string().url("Proof photo URL is required"),
  notes: z.string().optional(),
});

// Helper: Resolve NGO for authenticated user
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
      message: "No NGO organization found for this user",
    });
  }
  return ngo;
}

// Helper: Resolve VolunteerProfile for authenticated user
async function resolveVolunteerProfile(userId: string) {
  let profile = await prisma.volunteerProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    profile = await prisma.volunteerProfile.create({
      data: {
        userId,
        availability: true,
      },
    });
  }
  return profile;
}

/**
 * 1. NGO: Get Volunteer Roster
 * GET /api/v1/ngo/volunteers
 */
export const getNgoVolunteers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);

    // Fetch affiliated volunteers or all active volunteers in the system
    const affiliated = await prisma.ngoVolunteer.findMany({
      where: { ngoId: ngo.id, status: "ACTIVE" },
      include: {
        volunteer: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    let volunteersList = affiliated.map((item) => ({
      id: item.volunteer.id,
      userId: item.volunteer.userId,
      name: item.volunteer.user.name,
      email: item.volunteer.user.email,
      phone: item.volunteer.user.phone,
      availability: item.volunteer.availability,
      vehicleType: item.volunteer.vehicleType,
      ratingAvg: item.volunteer.ratingAvg,
      tasksCompleted: item.volunteer.tasksCompleted,
      rewardPoints: item.volunteer.rewardPoints,
      isAffiliated: true,
    }));

    // If roster is small, also provide available unassigned volunteers
    if (volunteersList.length === 0) {
      const allVolunteers = await prisma.volunteerProfile.findMany({
        where: { availability: true },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        take: 10,
      });

      volunteersList = allVolunteers.map((v) => ({
        id: v.id,
        userId: v.userId,
        name: v.user.name,
        email: v.user.email,
        phone: v.user.phone,
        availability: v.availability,
        vehicleType: v.vehicleType,
        ratingAvg: v.ratingAvg,
        tasksCompleted: v.tasksCompleted,
        rewardPoints: v.rewardPoints,
        isAffiliated: false,
      }));
    }

    res.status(200).json({
      success: true,
      data: { volunteers: volunteersList },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. NGO: Assign Volunteer to Approved Donation
 * POST /api/v1/ngo/donations/:id/assign
 */
export const assignVolunteerToDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = assignVolunteerSchema.parse(req.body);
    const userId = req.user!.userId;
    const ngo = await resolveUserNgo(userId);

    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: donationId },
        include: { donor: true },
      });

      if (!donation) {
        throw new AppError({
          statusCode: 404,
          code: "DONATION_NOT_FOUND",
          message: "Donation not found",
        });
      }

      if (donation.acceptedByNgoId !== ngo.id) {
        throw new AppError({
          statusCode: 403,
          code: "UNAUTHORIZED_NGO",
          message: "Only the NGO that accepted this donation can assign a volunteer",
        });
      }

      // Validate lifecycle state transition (must be APPROVED -> ASSIGNED)
      DonationStateMachine.validateTransition(donation.status, DonationStatus.ASSIGNED);

      // Verify volunteer exists
      const volunteer = await tx.volunteerProfile.findUnique({
        where: { id: data.volunteerId },
        include: { user: true },
      });

      if (!volunteer) {
        throw new AppError({
          statusCode: 404,
          code: "VOLUNTEER_NOT_FOUND",
          message: "Selected volunteer profile was not found",
        });
      }

      // Create Assignment record
      const assignment = await tx.assignment.create({
        data: {
          donationId: donation.id,
          ngoId: ngo.id,
          volunteerId: volunteer.id,
          assignedById: userId,
          status: AssignmentStatus.ASSIGNED,
          deliveryAddressSnap: data.deliveryAddressSnap || ngo.address,
          notes: data.notes,
        },
      });

      // Update donation state to ASSIGNED
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: {
          status: DonationStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      // Ensure NGO affiliation is recorded
      await tx.ngoVolunteer.upsert({
        where: {
          ngoId_volunteerId: {
            ngoId: ngo.id,
            volunteerId: volunteer.id,
          },
        },
        create: {
          ngoId: ngo.id,
          volunteerId: volunteer.id,
          status: "ACTIVE",
        },
        update: {
          status: "ACTIVE",
        },
      });

      // Notify Volunteer
      await createNotification(
        volunteer.userId,
        "NEW_ASSIGNMENT",
        "New Delivery Assignment",
        `You have been assigned to pick up donation #${donation.id.slice(0, 8)} for ${ngo.name}.`,
        { assignmentId: assignment.id, donationId: donation.id }
      );

      // Notify Donor
      await createNotification(
        donation.donorId,
        "VOLUNTEER_ASSIGNED",
        "Volunteer Assigned to Your Donation",
        `Volunteer ${volunteer.user.name} has been assigned to pick up your donation.`,
        { assignmentId: assignment.id, donationId: donation.id }
      );

      return { assignment, donation: updatedDonation };
    });

    res.status(200).json({
      success: true,
      message: "Volunteer assigned successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. VOLUNTEER: Get My Assigned Tasks
 * GET /api/v1/volunteer/tasks
 */
export const getVolunteerTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await resolveVolunteerProfile(req.user!.userId);

    const assignments = await prisma.assignment.findMany({
      where: { volunteerId: profile.id },
      include: {
        donation: {
          include: {
            category: true,
            images: true,
            donor: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        ngo: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
            officialEmail: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Per specifications: Exact donor contact is exposed ONLY because task is assigned to this volunteer
    res.status(200).json({
      success: true,
      data: {
        profile: {
          availability: profile.availability,
          tasksCompleted: profile.tasksCompleted,
          rewardPoints: profile.rewardPoints,
          ratingAvg: profile.ratingAvg,
        },
        tasks: assignments,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. VOLUNTEER: Confirm Pickup
 * POST /api/v1/volunteer/tasks/:id/pickup
 */
export const confirmPickup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const profile = await resolveVolunteerProfile(req.user!.userId);

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        include: { donation: true, ngo: true },
      });

      if (!assignment || assignment.volunteerId !== profile.id) {
        throw new AppError({
          statusCode: 404,
          code: "ASSIGNMENT_NOT_FOUND",
          message: "Task not found or not assigned to you",
        });
      }

      if (assignment.status !== AssignmentStatus.ASSIGNED) {
        throw new AppError({
          statusCode: 400,
          code: "INVALID_TASK_STATUS",
          message: `Cannot confirm pickup for task in status ${assignment.status}`,
        });
      }

      DonationStateMachine.validateTransition(assignment.donation.status, DonationStatus.PICKED_UP);

      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.PICKED_UP,
          pickupConfirmedAt: new Date(),
        },
      });

      const updatedDonation = await tx.donation.update({
        where: { id: assignment.donationId },
        data: {
          status: DonationStatus.PICKED_UP,
          pickedUpAt: new Date(),
        },
      });

      // Notify Donor
      await createNotification(
        assignment.donation.donorId,
        "DONATION_PICKED_UP",
        "Donation Picked Up",
        "The volunteer has picked up your donation and is en route to the NGO.",
        { donationId: assignment.donationId }
      );

      return { assignment: updatedAssignment, donation: updatedDonation };
    });

    res.status(200).json({
      success: true,
      message: "Pickup confirmed successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. VOLUNTEER: Complete Delivery with Proof Photo
 * POST /api/v1/volunteer/tasks/:id/deliver
 * Acceptance: Transitions status to DELIVERED, updates volunteer points, creates inventory and receipt
 */
export const completeDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = completeDeliverySchema.parse(req.body);
    const profile = await resolveVolunteerProfile(req.user!.userId);

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        include: { donation: true, ngo: true },
      });

      if (!assignment || assignment.volunteerId !== profile.id) {
        throw new AppError({
          statusCode: 404,
          code: "ASSIGNMENT_NOT_FOUND",
          message: "Task not found or not assigned to you",
        });
      }

      if (assignment.status !== AssignmentStatus.PICKED_UP) {
        throw new AppError({
          statusCode: 400,
          code: "INVALID_TASK_STATUS",
          message: `Pickup must be confirmed before marking delivered (current: ${assignment.status})`,
        });
      }

      DonationStateMachine.validateTransition(assignment.donation.status, DonationStatus.DELIVERED);

      const now = new Date();

      // 1. Update Assignment
      const updatedAssignment = await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.DELIVERED,
          deliveredAt: now,
          proofPhotoUrl: data.proofPhotoUrl,
          notes: data.notes || assignment.notes,
        },
      });

      // 2. Update Donation
      const updatedDonation = await tx.donation.update({
        where: { id: assignment.donationId },
        data: {
          status: DonationStatus.DELIVERED,
          deliveredAt: now,
        },
      });

      // 3. Increment Volunteer Stats & Rewards (10 points per delivery)
      await tx.volunteerProfile.update({
        where: { id: profile.id },
        data: {
          tasksCompleted: { increment: 1 },
          rewardPoints: { increment: 10 },
        },
      });

      await tx.rewardEvent.create({
        data: {
          userId: profile.userId,
          points: 10,
          reason: `Delivered donation #${assignment.donationId.slice(0, 8)}`,
        },
      });

      // 4. Automatically add to NGO Inventory
      await tx.inventoryItem.create({
        data: {
          ngoId: assignment.ngoId,
          donationId: assignment.donationId,
          categoryId: assignment.donation.categoryId,
          name: `${assignment.donation.description || "Donated Goods"} (${assignment.donation.quantity} ${assignment.donation.unit})`,
          quantity: assignment.donation.quantity,
          unit: assignment.donation.unit,
        },
      });

      // 5. Issue Receipt
      const receiptNumber = `DC-REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const receipt = await tx.receipt.create({
        data: {
          donationId: assignment.donationId,
          receiptNumber,
          impactSummary: `Successfully transferred ${assignment.donation.quantity} ${assignment.donation.unit} to ${assignment.ngo.name}`,
        },
      });

      // 6. Notify Donor
      await createNotification(
        assignment.donation.donorId,
        "DONATION_DELIVERED",
        "Donation Delivered Successfully! 🎉",
        `Your donation has been safely delivered to ${assignment.ngo.name}. Receipt #${receiptNumber} generated.`,
        { donationId: assignment.donationId, receiptNumber }
      );

      return {
        assignment: updatedAssignment,
        donation: updatedDonation,
        receipt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Delivery completed successfully! Receipt generated and items added to inventory.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. VOLUNTEER: Toggle Availability
 * PATCH /api/v1/volunteer/availability
 */
export const updateAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateAvailabilitySchema.parse(req.body);
    const profile = await resolveVolunteerProfile(req.user!.userId);

    const updated = await prisma.volunteerProfile.update({
      where: { id: profile.id },
      data: {
        availability: data.availability,
        vehicleType: data.vehicleType !== undefined ? data.vehicleType : profile.vehicleType,
      },
    });

    res.status(200).json({
      success: true,
      data: { profile: updated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. NGO: Get Inventory Items
 * GET /api/v1/ngo/inventory
 */
export const getNgoInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ngo = await resolveUserNgo(req.user!.userId);

    const inventory = await prisma.inventoryItem.findMany({
      where: { ngoId: ngo.id },
      include: {
        category: true,
        donation: {
          select: {
            id: true,
            description: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { inventory },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. PUBLIC / DONOR / NGO: Get Donation Receipt
 * GET /api/v1/donations/:id/receipt
 */
export const getDonationReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const receipt = await prisma.receipt.findUnique({
      where: { donationId },
      include: {
        donation: {
          include: {
            donor: { select: { id: true, name: true, email: true } },
            category: true,
            acceptedByNgo: { select: { id: true, name: true, officialEmail: true } },
          },
        },
      },
    });

    if (!receipt) {
      throw new AppError({
        statusCode: 404,
        code: "RECEIPT_NOT_FOUND",
        message: "Receipt not found for this donation. Has it been delivered yet?",
      });
    }

    res.status(200).json({
      success: true,
      data: { receipt },
    });
  } catch (err) {
    next(err);
  }
};
