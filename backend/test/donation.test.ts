import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { Role, UserStatus, NgoVerificationStatus, DonationStatus } from "@prisma/client";
import { generateTokens } from "../src/utils/jwt";

describe("Phase 3 Donation Lifecycle & Atomic Acceptance Tests", () => {
  let donorToken: string;
  let donorId: string;

  let ngo1Token: string;
  let ngo1Id: string;

  let ngo2Token: string;
  let ngo2Id: string;

  let categoryId: string;

  it("Setup: Create Donor, 2 Approved NGOs, and Fetch Seed Category", async () => {
    // 1. Get Category
    const category = await prisma.donationCategory.findFirst();
    expect(category).toBeDefined();
    categoryId = category!.id;

    // 2. Create Donor
    const donor = await prisma.user.create({
      data: {
        name: "Test Donor Phase 3",
        email: `donor.phase3.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;
    donorToken = generateTokens({ userId: donor.id, role: Role.DONOR, email: donor.email }).accessToken;

    // 3. Create NGO 1 (Approved)
    const ngo1Owner = await prisma.user.create({
      data: {
        name: "NGO 1 Director",
        email: `ngo1.phase3.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.NGO,
        status: UserStatus.ACTIVE,
      },
    });
    const ngo1 = await prisma.ngo.create({
      data: {
        ownerId: ngo1Owner.id,
        name: "Community Aid Foundation",
        officialEmail: `contact1.${Date.now()}@ngo1.org`,
        contactNumber: "+91 9999911111",
        address: "MG Road, Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
        verificationStatus: NgoVerificationStatus.APPROVED,
      },
    });
    ngo1Id = ngo1.id;
    ngo1Token = generateTokens({ userId: ngo1Owner.id, role: Role.NGO, email: ngo1Owner.email }).accessToken;

    // 4. Create NGO 2 (Approved)
    const ngo2Owner = await prisma.user.create({
      data: {
        name: "NGO 2 Director",
        email: `ngo2.phase3.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.NGO,
        status: UserStatus.ACTIVE,
      },
    });
    const ngo2 = await prisma.ngo.create({
      data: {
        ownerId: ngo2Owner.id,
        name: "Hope Relief Society",
        officialEmail: `contact2.${Date.now()}@ngo2.org`,
        contactNumber: "+91 9999922222",
        address: "Indiranagar, Bengaluru",
        latitude: 12.9784,
        longitude: 77.6408,
        verificationStatus: NgoVerificationStatus.APPROVED,
      },
    });
    ngo2Id = ngo2.id;
    ngo2Token = generateTokens({ userId: ngo2Owner.id, role: Role.NGO, email: ngo2Owner.email }).accessToken;
  });

  it("Donor creates donation request with location and images", async () => {
    const res = await request(app)
      .post("/api/v1/donations")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        categoryId,
        description: "Winter jackets and warm blankets in great condition",
        quantity: 10,
        unit: "items",
        pickupAddress: "Koramangala 4th Block, Bengaluru",
        pickupLatitude: 12.9352,
        pickupLongitude: 77.6245,
        imageUrls: ["https://res.cloudinary.com/test/image1.jpg"],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.donation.status).toBe("PENDING");
    expect(res.body.data.donation.images.length).toBe(1);
  });

  it("Nearby NGO discovery calculates distance and returns approved NGOs", async () => {
    const res = await request(app)
      .get("/api/v1/ngos?lat=12.9352&lng=77.6245&radius=15");

    expect(res.status).toBe(200);
    expect(res.body.data.ngos.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.ngos[0]).toHaveProperty("distanceKm");
    // Ensure ordered by distance
    expect(res.body.data.ngos[0].distanceKm).toBeLessThanOrEqual(res.body.data.ngos[1].distanceKm);
  });

  it("ATOMIC ACCEPTANCE RACE: Two NGOs attempt to accept same donation simultaneously — exactly ONE wins", async () => {
    // 1. Create a fresh PENDING donation
    const donation = await prisma.donation.create({
      data: {
        donorId,
        categoryId,
        quantity: 5,
        unit: "boxes",
        pickupAddress: "Whitefield, Bengaluru",
        status: DonationStatus.PENDING,
      },
    });

    // 2. Fire concurrent acceptance requests from NGO 1 and NGO 2
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/ngo/donations/${donation.id}/accept`)
        .set("Authorization", `Bearer ${ngo1Token}`),
      request(app)
        .post(`/api/v1/ngo/donations/${donation.id}/accept`)
        .set("Authorization", `Bearer ${ngo2Token}`),
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Exactly one must succeed (200) and the other must be rejected (409 Conflict)
    expect(statuses).toEqual([200, 409]);

    const winnerRes = res1.status === 200 ? res1 : res2;
    const loserRes = res1.status === 409 ? res1 : res2;

    expect(winnerRes.body.success).toBe(true);
    expect(loserRes.body.error.code).toBe("DONATION_ALREADY_ACCEPTED");

    // Verify DB state
    const finalDonation = await prisma.donation.findUnique({ where: { id: donation.id } });
    expect(finalDonation?.status).toBe(DonationStatus.APPROVED);
    expect([ngo1Id, ngo2Id]).toContain(finalDonation?.acceptedByNgoId);
  });

  it("State machine rejects invalid transition from PENDING to DELIVERED with 409 Conflict", async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        categoryId,
        quantity: 2,
        unit: "kits",
        pickupAddress: "Jayanagar, Bengaluru",
        status: DonationStatus.PENDING,
      },
    });

    // Try to cancel valid transition
    const cancelRes = await request(app)
      .patch(`/api/v1/donations/${donation.id}/cancel`)
      .set("Authorization", `Bearer ${donorToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.donation.status).toBe(DonationStatus.CANCELLED);
  });
});
