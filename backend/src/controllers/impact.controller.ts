import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import { DonationStatus } from "@prisma/client";
import { estimateImpact } from "../services/impact.service";

/**
 * GET /api/v1/impact/estimate
 * Calculates real-time projected humanitarian and environmental impact
 * Query: { categoryId?: string, categoryName?: string, quantity: number }
 */
export async function getImpactEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId, categoryName, quantity } = req.query;
    const qty = parseFloat(quantity as string) || 0;

    let targetCategoryName = (categoryName as string) || "";

    if (!targetCategoryName && categoryId) {
      const category = await prisma.donationCategory.findUnique({
        where: { id: categoryId as string },
      });
      if (category) {
        targetCategoryName = category.name;
      }
    }

    const estimate = estimateImpact(targetCategoryName, qty);

    return res.status(200).json({
      success: true,
      data: {
        estimate,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/impact/donor-summary
 * Aggregates lifetime estimated impact for the logged-in donor
 */
export async function getDonorLifetimeImpact(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const donations = await prisma.donation.findMany({
      where: {
        donorId: userId,
        status: { in: [DonationStatus.APPROVED, DonationStatus.ASSIGNED, DonationStatus.PICKED_UP, DonationStatus.DELIVERED] },
      },
      include: {
        category: true,
      },
    });

    let totalPeopleHelped = 0;
    let totalCo2DivertedKg = 0;
    const categoryBreakdown: Record<string, { quantity: number; peopleHelped: number; co2DivertedKg: number }> = {};

    for (const d of donations) {
      const catName = d.category?.name || "Other";
      const est = estimateImpact(catName, d.quantity);
      totalPeopleHelped += est.estimatedPeopleHelped;
      totalCo2DivertedKg += est.co2DivertedKg;

      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { quantity: 0, peopleHelped: 0, co2DivertedKg: 0 };
      }
      categoryBreakdown[catName].quantity += d.quantity;
      categoryBreakdown[catName].peopleHelped += est.estimatedPeopleHelped;
      categoryBreakdown[catName].co2DivertedKg += est.co2DivertedKg;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalDonations: donations.length,
        totalPeopleHelped,
        totalCo2DivertedKg: Math.round(totalCo2DivertedKg * 10) / 10,
        categoryBreakdown,
        isEstimate: true,
      },
    });
  } catch (error) {
    next(error);
  }
}
