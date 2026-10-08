import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { Role, UserStatus, NgoVerificationStatus, DonationStatus, RatingKind } from "@prisma/client";
import { generateTokens } from "../src/utils/jwt";

describe("Phase 6 Collaboration Tests (Ratings, Rewards, Chat, Notes, Team, Analytics)", () => {
  let donorToken: string;
  let donorId: string;

  let ngoOwnerToken: string;
  let ngoId: string;
  let ngoOwnerId: string;

  let volunteerToken: string;
  let volunteerUserId: string;

  let categoryId: string;
  let donationId: string;
  let threadId: string;

  it("Setup: Create Donor, Approved NGO, Volunteer, and Delivered Donation", async () => {
    // 1. Category
    const category = await prisma.donationCategory.findFirst();
    expect(category).toBeDefined();
    categoryId = category!.id;

    // 2. Donor
    const donor = await prisma.user.create({
      data: {
        name: "Collab Donor",
        email: `collab.donor.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;
    donorToken = generateTokens({ userId: donor.id, role: Role.DONOR, email: donor.email }).accessToken;

    // 3. NGO
    const ngoOwner = await prisma.user.create({
      data: {
        name: "Collab NGO Director",
        email: `collab.ngo.${Date.now()}@help.org`,
        passwordHash: "hash123",
        role: Role.NGO,
        status: UserStatus.ACTIVE,
      },
    });
    ngoOwnerId = ngoOwner.id;
    ngoOwnerToken = generateTokens({ userId: ngoOwner.id, role: Role.NGO, email: ngoOwner.email }).accessToken;

    const ngo = await prisma.ngo.create({
      data: {
        ownerId: ngoOwner.id,
        name: "Helping Hands Global",
        officialEmail: `contact.${Date.now()}@helpinghands.org`,
        contactNumber: "+91 9988771122",
        address: "7th Sector, HSR Layout, Bengaluru",
        verificationStatus: NgoVerificationStatus.APPROVED,
      },
    });
    ngoId = ngo.id;

    // 4. Volunteer with Profile
    const volunteer = await prisma.user.create({
      data: {
        name: "Swift Courier",
        email: `collab.volunteer.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.VOLUNTEER,
        status: UserStatus.ACTIVE,
      },
    });
    volunteerUserId = volunteer.id;
    volunteerToken = generateTokens({ userId: volunteer.id, role: Role.VOLUNTEER, email: volunteer.email }).accessToken;

    await prisma.volunteerProfile.create({
      data: {
        userId: volunteer.id,
        availability: true,
        tasksCompleted: 5,
        rewardPoints: 250,
      },
    });

    // Seed a reward event for volunteer
    await prisma.rewardEvent.create({
      data: {
        userId: volunteer.id,
        points: 50,
        reason: "Delivered priority emergency rations",
      },
    });

    // 5. Create Delivered Donation & Assignment
    const donation = await prisma.donation.create({
      data: {
        donorId: donor.id,
        categoryId,
        description: "Fresh Organic Vegetables",
        quantity: 20,
        unit: "kg",
        pickupAddress: "123 Green Way, Bengaluru",
        status: DonationStatus.DELIVERED,
        acceptedByNgoId: ngo.id,
      },
    });
    donationId = donation.id;

    const vProfile = await prisma.volunteerProfile.findUnique({ where: { userId: volunteer.id } });
    await prisma.assignment.create({
      data: {
        donationId: donation.id,
        ngoId: ngo.id,
        volunteerId: vProfile!.id,
        assignedById: ngoOwner.id,
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
  });

  it("1. Ratings & Reputation: Donor rates NGO and Delivery Volunteer", async () => {
    // Donor rates NGO
    const resNgo = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        donationId,
        kind: "DONOR_TO_NGO",
        score: 5,
        comment: "Excellent and prompt communication by the shelter team!",
      });

    expect(resNgo.status).toBe(201);
    expect(resNgo.body.success).toBe(true);
    expect(resNgo.body.data.rating.score).toBe(5);

    // Donor rates Volunteer
    const resVol = await request(app)
      .post("/api/v1/ratings")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        donationId,
        kind: "DONOR_TO_VOLUNTEER",
        score: 5,
        comment: "Very polite courier, handled boxes carefully.",
      });

    expect(resVol.status).toBe(201);
    expect(resVol.body.success).toBe(true);
    expect(resVol.body.data.rating.score).toBe(5);

    // Verify volunteer profile ratingAvg updated
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: volunteerUserId } });
    expect(profile?.ratingAvg).toBe(5.0);
  });

  it("2. Volunteer Karma & Rewards: GET /api/v1/volunteer/rewards", async () => {
    const res = await request(app)
      .get("/api/v1/volunteer/rewards")
      .set("Authorization", `Bearer ${volunteerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalKarma).toBe(250);
    expect(res.body.data.tasksCompleted).toBe(5);
    expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
  });

  it("3. Chat Messaging: Create Thread and Exchange Messages", async () => {
    // Create/get thread for donation
    const threadRes = await request(app)
      .post("/api/v1/chat/threads")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ donationId });

    expect(threadRes.status).toBe(200);
    expect(threadRes.body.success).toBe(true);
    threadId = threadRes.body.data.thread.id;

    // Donor sends message
    const msg1Res = await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ body: "Hello! The boxes are packed and ready at the gate." });

    expect(msg1Res.status).toBe(201);
    expect(msg1Res.body.data.message.body).toBe("Hello! The boxes are packed and ready at the gate.");

    // NGO responds
    const msg2Res = await request(app)
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({ body: "Thank you! Our volunteer is en route to collect." });

    expect(msg2Res.status).toBe(201);

    // Retrieve thread messages
    const listRes = await request(app)
      .get(`/api/v1/chat/threads/${threadId}/messages`)
      .set("Authorization", `Bearer ${donorToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.messages.length).toBe(2);
  });

  it("4. NGO Internal Notes: Private team documentation", async () => {
    const res = await request(app)
      .post("/api/v1/ngo/notes")
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({
        donationId,
        body: "Inspection passed: Quality was premium grade A. Dispatched to community kitchen.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.note.body).toContain("Inspection passed");

    // Fetch notes
    const listRes = await request(app)
      .get("/api/v1/ngo/notes")
      .set("Authorization", `Bearer ${ngoOwnerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.notes.length).toBeGreaterThanOrEqual(1);
  });

  it("5. NGO Team Management: Add and update staff roles", async () => {
    const staffEmail = `staff.${Date.now()}@helpinghands.org`;

    // Owner adds team member
    const addRes = await request(app)
      .post("/api/v1/ngo/team")
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({
        email: staffEmail,
        name: "Operations Coordinator",
        teamRole: "STAFF",
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.member.teamRole).toBe("STAFF");
    const memberId = addRes.body.data.member.id;

    // Promote staff to MANAGER
    const updateRes = await request(app)
      .patch(`/api/v1/ngo/team/${memberId}`)
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({ teamRole: "MANAGER" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.member.teamRole).toBe("MANAGER");

    // Get team roster
    const rosterRes = await request(app)
      .get("/api/v1/ngo/team")
      .set("Authorization", `Bearer ${ngoOwnerToken}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data.members.length).toBeGreaterThanOrEqual(1);
  });

  it("6. Donation Analytics: GET /api/v1/ngo/analytics", async () => {
    const res = await request(app)
      .get("/api/v1/ngo/analytics")
      .set("Authorization", `Bearer ${ngoOwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("totalReceived");
    expect(res.body.data).toHaveProperty("deliveredRate");
    expect(res.body.data).toHaveProperty("requestsFulfillmentRate");
    expect(res.body.data).toHaveProperty("categoryBreakdown");
  });
});
