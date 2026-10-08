import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { Role, UserStatus, NgoVerificationStatus } from "@prisma/client";
import { generateTokens } from "../src/utils/jwt";

describe("Phase 5 Dashboard, Reports, Beneficiary Requests & Admin Platform Tests", () => {
  let adminToken: string;
  let adminId: string;

  let ngoOwnerToken: string;
  let ngoId: string;
  let ngoOwnerId: string;

  let donorToken: string;
  let donorId: string;

  let categoryId: string;
  let beneficiaryRequestId: string;
  let inventoryItemId: string;

  it("Setup: Create Admin, NGO, Donor, and Seed Category", async () => {
    // 1. Seed category
    const category = await prisma.donationCategory.findFirst();
    expect(category).toBeDefined();
    categoryId = category!.id;

    // 2. Admin User
    const admin = await prisma.user.create({
      data: {
        name: "Platform SuperAdmin",
        email: `admin.phase5.${Date.now()}@donateconnect.org`,
        passwordHash: "hash123",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;
    adminToken = generateTokens({ userId: admin.id, role: Role.ADMIN, email: admin.email }).accessToken;

    // 3. NGO Owner and NGO
    const ngoOwner = await prisma.user.create({
      data: {
        name: "Phase 5 NGO Lead",
        email: `ngo.lead.phase5.${Date.now()}@hopefoundation.org`,
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
        name: "Hope Community Foundation",
        officialEmail: `contact.phase5.${Date.now()}@hopefoundation.org`,
        contactNumber: "+91 9988776655",
        panCardUrl: "https://example.com/pan.jpg",
        address: "123 Hope Lane, Bengaluru, Karnataka 560001",
        verificationStatus: NgoVerificationStatus.APPROVED,
        verifiedById: admin.id,
        verifiedAt: new Date(),
      },
    });
    ngoId = ngo.id;

    // 4. Donor
    const donor = await prisma.user.create({
      data: {
        name: "Phase 5 Generous Donor",
        email: `donor.phase5.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;
    donorToken = generateTokens({ userId: donor.id, role: Role.DONOR, email: donor.email }).accessToken;
  });

  it("1. Donor Dashboard: GET /api/v1/donor/dashboard returns impact stats and history", async () => {
    const res = await request(app)
      .get("/api/v1/donor/dashboard")
      .set("Authorization", `Bearer ${donorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toHaveProperty("totalDonations");
    expect(res.body.data.stats).toHaveProperty("totalItems");
    expect(res.body.data.stats).toHaveProperty("ngosSupported");
    expect(res.body.data.stats).toHaveProperty("deliveredCount");
    expect(Array.isArray(res.body.data.donations)).toBe(true);
  });

  it("2. Beneficiary Requests: NGO creates a needy community request", async () => {
    const res = await request(app)
      .post("/api/v1/ngo/requests")
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({
        categoryId,
        title: "Winter Blankets for Senior Shelter",
        quantityNeeded: 25,
        urgency: "HIGH",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.title).toBe("Winter Blankets for Senior Shelter");
    expect(res.body.data.request.status).toBe("OPEN");
    beneficiaryRequestId = res.body.data.request.id;
  });

  it("3. Inventory & Matching: Stock deduction and donation matching", async () => {
    // Seed an inventory item in the NGO warehouse
    const inv = await prisma.inventoryItem.create({
      data: {
        ngoId,
        categoryId,
        name: "Fleece Winter Blankets",
        quantity: 30,
        unit: "PIECES",
      },
    });
    inventoryItemId = inv.id;

    // Match 15 units to the beneficiary request
    const res = await request(app)
      .post("/api/v1/ngo/matches")
      .set("Authorization", `Bearer ${ngoOwnerToken}`)
      .send({
        beneficiaryRequestId,
        inventoryItemId: inv.id,
        quantity: 15,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.match.quantity).toBe(15);
    expect(res.body.data.request.quantityFulfilled).toBe(15);
    expect(res.body.data.request.status).toBe("PARTIALLY_FULFILLED");
  });

  it("4. NGO Reports & Metrics: GET /api/v1/ngo/reports", async () => {
    const res = await request(app)
      .get("/api/v1/ngo/reports")
      .set("Authorization", `Bearer ${ngoOwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toHaveProperty("totalAccepted");
    expect(res.body.data.metrics).toHaveProperty("totalDelivered");
    expect(res.body.data.metrics).toHaveProperty("activeInventoryBatches");
    expect(res.body.data.metrics).toHaveProperty("activeVolunteers");
    expect(res.body.data.metrics).toHaveProperty("beneficiaryRequests");
  });

  it("5. Grievances: Donor creates a complaint", async () => {
    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        targetNgoId: ngoId,
        subject: "Pickup Time Mismatch",
        description: "The delivery partner arrived 2 hours after agreed window.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.subject).toBe("Pickup Time Mismatch");
    expect(res.body.data.complaint.status).toBe("OPEN");
  });

  it("6. Admin Platform Statistics: GET /api/v1/admin/stats", async () => {
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("users");
    expect(res.body.data).toHaveProperty("ngos");
    expect(res.body.data).toHaveProperty("donations");
    expect(res.body.data).toHaveProperty("governance");
    expect(res.body.data.governance.openComplaints).toBeGreaterThanOrEqual(1);
  });

  it("7. Admin NGO Verification Queue & Audit Log", async () => {
    // Create pending NGO
    const pendingOwner = await prisma.user.create({
      data: {
        name: "Pending Applicant",
        email: `pending.p5.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.NGO,
        status: UserStatus.ACTIVE,
      },
    });

    const pendingNgo = await prisma.ngo.create({
      data: {
        ownerId: pendingOwner.id,
        name: "Sunrise Child Welfare",
        officialEmail: `info.sunrise.${Date.now()}@example.com`,
        contactNumber: "+91 9988771122",
        panCardUrl: "https://example.com/pan.jpg",
        address: "44 MG Road, Bengaluru, Karnataka 560025",
        verificationStatus: NgoVerificationStatus.PENDING,
      },
    });

    // Verify queue lists pending NGO
    const queueRes = await request(app)
      .get("/api/v1/admin/ngos/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(queueRes.status).toBe(200);
    const found = queueRes.body.data.ngos.some((n: any) => n.id === pendingNgo.id);
    expect(found).toBe(true);

    // Admin approves the NGO
    const approveRes = await request(app)
      .post(`/api/v1/admin/ngos/${pendingNgo.id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "APPROVE" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.ngo.verificationStatus).toBe("APPROVED");

    // Check AuditLog was written
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: pendingNgo.id, action: "NGO_APPROVED" },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("8. Admin User Suspension & Activation", async () => {
    // Suspend donor
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${donorId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "SUSPENDED" });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe("SUSPENDED");

    // Re-activate donor
    const activateRes = await request(app)
      .patch(`/api/v1/admin/users/${donorId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.data.user.status).toBe("ACTIVE");
  });
});
