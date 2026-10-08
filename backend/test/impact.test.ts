import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { Role, DonationStatus } from "@prisma/client";
import { generateTokens } from "../src/utils/jwt";
import bcrypt from "bcryptjs";

describe("Phase 7 AI & Impact Estimation Tests", () => {
  let donorToken: string;
  let categoryId: string;
  let donorUserId: string;

  beforeAll(async () => {
    // 1. Create unique test Donor
    const email = `phase7_donor_${Date.now()}@test.org`;
    const passwordHash = await bcrypt.hash("TestPass123!", 10);
    const donorUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.DONOR,
        name: "Eco Humanitarian Donor",
        phone: "+919876500007",
        emailVerifiedAt: new Date(),
      },
    });
    donorUserId = donorUser.id;
    donorToken = generateTokens({ userId: donorUser.id, role: Role.DONOR, email: donorUser.email }).accessToken;

    // 2. Fetch or create Food category
    const cat = await prisma.donationCategory.upsert({
      where: { name: "Food" },
      update: {},
      create: { name: "Food", icon: "🍱" },
    });
    categoryId = cat.id;

    // 3. Create a delivered donation to test lifetime impact calculations
    await prisma.donation.create({
      data: {
        donorId: donorUserId,
        categoryId: cat.id,
        description: "100 meal packets for shelter",
        quantity: 100,
        unit: "packets",
        pickupAddress: "45 MG Road, Bengaluru",
        status: DonationStatus.DELIVERED,
      },
    });
  });

  it("1. Public Impact Estimate: GET /api/v1/impact/estimate returns explainable metrics", async () => {
    const res = await request(app)
      .get("/api/v1/impact/estimate")
      .query({ categoryName: "Food", quantity: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estimate).toBeDefined();
    expect(res.body.data.estimate.isEstimate).toBe(true);
    expect(res.body.data.estimate.estimatedPeopleHelped).toBe(50); // 20 * 2.5 = 50
    expect(res.body.data.estimate.co2DivertedKg).toBe(36); // 20 * 1.8 = 36.0
    expect(res.body.data.estimate.primaryBenefit).toContain("Nutritious Meals");
  });

  it("2. Public Impact Estimate by Category ID", async () => {
    const res = await request(app)
      .get("/api/v1/impact/estimate")
      .query({ categoryId, quantity: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.estimate.estimatedPeopleHelped).toBe(25); // 10 * 2.5 = 25
  });

  it("3. Authenticated Donor Lifetime Impact: GET /api/v1/impact/donor-summary", async () => {
    const res = await request(app)
      .get("/api/v1/impact/donor-summary")
      .set("Authorization", `Bearer ${donorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalDonations).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPeopleHelped).toBe(250); // 100 * 2.5 = 250
    expect(res.body.data.totalCo2DivertedKg).toBe(180); // 100 * 1.8 = 180
    expect(res.body.data.categoryBreakdown.Food).toBeDefined();
  });
});
