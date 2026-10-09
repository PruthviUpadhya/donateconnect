import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { DonationStatus, NgoVerificationStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { DonationStateMachine } from "../services/donation-state-machine.service";
import { findNearbyVerifiedNgos } from "../services/nearby-ngo.service";
import { createNotification } from "../services/notification.service";

// Validation Schemas
export const createDonationSchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unit: z.string().min(1, "Unit of measurement is required"), // e.g. "kg", "items", "boxes"
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  imageUrls: z.array(z.string().url()).optional().default([]),
});

export const rejectDonationSchema = z.object({
  reason: z.string().optional(),
});

// 1. DONOR: Create Donation Request
export const createDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createDonationSchema.parse(req.body);
    const donorId = req.user!.userId;

    const donation = await prisma.$transaction(async (tx) => {
      const created = await tx.donation.create({
        data: {
          donorId,
          categoryId: data.categoryId,
          description: data.description,
          quantity: data.quantity,
          unit: data.unit,
          pickupAddress: data.pickupAddress,
          pickupLatitude: data.pickupLatitude,
          pickupLongitude: data.pickupLongitude,
          status: DonationStatus.PENDING,
        },
        include: {
          category: true,
        },
      });

      if (data.imageUrls && data.imageUrls.length > 0) {
        await tx.donationImage.createMany({
          data: data.imageUrls.map((url, idx) => ({
            donationId: created.id,
            url,
            sortOrder: idx,
          })),
        });
      }

      return created;
    });

    const fullDonation = await prisma.donation.findUnique({
      where: { id: donation.id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Donation submitted successfully and is visible to nearby verified NGOs",
      data: { donation: fullDonation },
    });
  } catch (err) {
    next(err);
  }
};

// 2. DONOR: Get My Donations
export const getMyDonations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donorId = req.user!.userId;
    const donations = await prisma.donation.findMany({
      where: { donorId },
      include: {
        category: true,
        images: true,
        acceptedByNgo: {
          select: {
            id: true,
            name: true,
            officialEmail: true,
            contactNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { donations },
    });
  } catch (err) {
    next(err);
  }
};

// 3. DONOR: Get Donation Details by ID
export const getDonationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        acceptedByNgo: {
          select: {
            id: true,
            name: true,
            officialEmail: true,
            contactNumber: true,
            address: true,
          },
        },
        assignments: {
          include: {
            volunteer: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!donation) {
      throw new AppError({
        statusCode: 404,
        code: "DONATION_NOT_FOUND",
        message: "Donation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { donation },
    });
  } catch (err) {
    next(err);
  }
};

// 4. DONOR: Cancel Donation
export const cancelDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const donorId = req.user!.userId;

    const donation = await prisma.donation.findUnique({ where: { id } });
    if (!donation) {
      throw new AppError({
        statusCode: 404,
        code: "DONATION_NOT_FOUND",
        message: "Donation not found",
      });
    }

    if (donation.donorId !== donorId && req.user!.role !== "ADMIN") {
      throw new AppError({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You can only cancel your own donations",
      });
    }

    DonationStateMachine.validateTransition(donation.status, DonationStatus.CANCELLED);

    const updated = await prisma.donation.update({
      where: { id },
      data: {
        status: DonationStatus.CANCELLED,
        ...DonationStateMachine.getTimestampUpdates(DonationStatus.CANCELLED),
      },
    });

    res.status(200).json({
      success: true,
      message: "Donation cancelled successfully",
      data: { donation: updated },
    });
  } catch (err) {
    next(err);
  }
};

// 5. PUBLIC/DONOR: Search Verified NGOs nearby
export const getNearbyNgos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 25;

    if (lat !== undefined && lng !== undefined) {
      const ngos = await findNearbyVerifiedNgos(lat, lng, radius);
      res.status(200).json({
        success: true,
        data: { ngos },
      });
      return;
    }

    // Default: list all approved verified NGOs
    const ngos = await prisma.ngo.findMany({
      where: { verificationStatus: NgoVerificationStatus.APPROVED },
      select: {
        id: true,
        name: true,
        officialEmail: true,
        contactNumber: true,
        address: true,
        latitude: true,
        longitude: true,
        websiteUrl: true,
      },
    });

    res.status(200).json({
      success: true,
      data: { ngos },
    });
  } catch (err) {
    next(err);
  }
};

// 6. NGO: List Available Donations (PENDING status)
export const getAvailableDonationsForNgo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Verify NGO affiliation & approved status
    const ngo = await prisma.ngo.findFirst({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });

    if (!ngo || ngo.verificationStatus !== NgoVerificationStatus.APPROVED) {
      throw new AppError({
        statusCode: 403,
        code: "NGO_UNVERIFIED",
        message: "Only verified partner NGOs can view available donations",
      });
    }

    const available = await prisma.donation.findMany({
      where: {
        status: DonationStatus.PENDING,
      },
      include: {
        category: true,
        images: true,
        donor: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { donations: available },
    });
  } catch (err) {
    next(err);
  }
};

// 7. NGO: Atomic Accept Donation (Conditional Race Safe Update)
export const acceptDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donationId = req.params.id as string;
    const userId = req.user!.userId;

    const ngo = await prisma.ngo.findFirst({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });

    if (!ngo || ngo.verificationStatus !== NgoVerificationStatus.APPROVED) {
      throw new AppError({
        statusCode: 403,
        code: "NGO_UNVERIFIED",
        message: "Only verified partner NGOs can accept donations",
      });
    }

    // Atomic conditional update: ONLY update if status is currently PENDING
    // This guarantees that if two NGOs race simultaneously, exactly one row is updated
    const updateResult = await prisma.donation.updateMany({
      where: {
        id: donationId,
        status: DonationStatus.PENDING,
      },
      data: {
        status: DonationStatus.APPROVED,
        acceptedByNgoId: ngo.id,
        approvedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      // Either donation doesn't exist, or another NGO already accepted it
      const current = await prisma.donation.findUnique({ where: { id: donationId } });
      if (!current) {
        throw new AppError({
          statusCode: 404,
          code: "DONATION_NOT_FOUND",
          message: "Donation not found",
        });
      }

      throw new AppError({
        statusCode: 409,
        code: "DONATION_ALREADY_ACCEPTED",
        message: `This donation is no longer available (current status: ${current.status})`,
      });
    }

    // Record NGO response tracking
    await prisma.donationNgoResponse.upsert({
      where: {
        donationId_ngoId: { donationId, ngoId: ngo.id },
      },
      update: { response: "ACCEPTED" },
      create: {
        donationId,
        ngoId: ngo.id,
        response: "ACCEPTED",
      },
    });

    const acceptedDonation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        category: true,
        donor: { select: { id: true, name: true, email: true } },
        acceptedByNgo: true,
      },
    });

    // Notify donor of acceptance
    if (acceptedDonation?.donor) {
      await createNotification(
        acceptedDonation.donor.id,
        "DONATION_ACCEPTED",
        "Donation Accepted!",
        `Great news! ${ngo.name} has accepted your donation of ${acceptedDonation.quantity} ${acceptedDonation.unit} ${acceptedDonation.category.name}.`,
        { donationId: acceptedDonation.id, ngoId: ngo.id }
      );
    }

    res.status(200).json({
      success: true,
      message: "Donation successfully accepted by your organization",
      data: { donation: acceptedDonation },
    });
  } catch (err) {
    next(err);
  }
};

// 8. NGO: Reject Donation
export const rejectDonation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donationId = req.params.id as string;
    const userId = req.user!.userId;
    const { reason } = rejectDonationSchema.parse(req.body);

    const ngo = await prisma.ngo.findFirst({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });

    if (!ngo || ngo.verificationStatus !== NgoVerificationStatus.APPROVED) {
      throw new AppError({
        statusCode: 403,
        code: "NGO_UNVERIFIED",
        message: "Only verified partner NGOs can record donation responses",
      });
    }

    await prisma.donationNgoResponse.upsert({
      where: {
        donationId_ngoId: { donationId, ngoId: ngo.id },
      },
      update: { response: "REJECTED", reason },
      create: {
        donationId,
        ngoId: ngo.id,
        response: "REJECTED",
        reason,
      },
    });

    res.status(200).json({
      success: true,
      message: "Donation marked as rejected for your organization",
    });
  } catch (err) {
    next(err);
  }
};

// 9. NGO: Get My Organization's Accepted Donations
export const getNgoDonations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

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

    const donations = await prisma.donation.findMany({
      where: { acceptedByNgoId: ngo.id },
      include: {
        category: true,
        images: true,
        donor: { select: { id: true, name: true, phone: true, address: true } },
        assignments: {
          include: {
            volunteer: { include: { user: { select: { id: true, name: true, phone: true } } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { donations },
    });
  } catch (err) {
    next(err);
  }
};

const SYSTEM_CATEGORIES = [
  { name: "Food", description: "Fresh, packaged, cooked, or raw food supplies", icon: "utensils" },
  { name: "Clothes", description: "Wearable garments, shoes, and blankets", icon: "shirt" },
  { name: "Books", description: "Educational textbooks, novels, and stationery", icon: "book-open" },
  { name: "Medical supplies", description: "First-aid kits, mobility aids, and OTC medicines", icon: "heart-pulse" },
  { name: "Electronics", description: "Computers, phones, gadgets, and appliances", icon: "laptop" },
  { name: "Furniture", description: "Desks, chairs, cots, and storage units", icon: "armchair" },
  { name: "Other", description: "General utility and uncategorized donations", icon: "box" },
];

// 7. PUBLIC / DONOR: Get All Donation Categories
export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let categories = await prisma.donationCategory.findMany({
      orderBy: { name: "asc" },
    });

    // If categories table is blank, automatically provision baseline categories
    if (categories.length === 0) {
      for (const cat of SYSTEM_CATEGORIES) {
        await prisma.donationCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: cat,
        });
      }
      categories = await prisma.donationCategory.findMany({
        orderBy: { name: "asc" },
      });
    }

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};
