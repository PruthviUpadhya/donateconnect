import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { Role, UserStatus, NgoVerificationStatus, DonationStatus, AssignmentStatus } from "@prisma/client";
import { generateTokens } from "../src/utils/jwt";

describe("Phase 4 Volunteer Lifecycle, Delivery & Inventory Tests", () => {
  let donorToken: string;
  let donorId: string;

  let ngoToken: string;
  let ngoId: string;
  let ngoOwnerId: string;

  let volunteerToken: string;
  let volunteerUserId: string;
  let volunteerProfileId: string;

  let categoryId: string;
  let donationId: string;
  let assignmentId: string;

  it("Setup: Create Donor, Approved NGO, Category, and Volunteer", async () => {
    // 1. Get seed category
    const category = await prisma.donationCategory.findFirst();
    expect(category).toBeDefined();
    categoryId = category!.id;

    // 2. Create Donor
    const donor = await prisma.user.create({
      data: {
        name: "Phase 4 Donor",
        email: `donor.phase4.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.DONOR,
        status: UserStatus.ACTIVE,
        phone: "+91 9876543210",
        address: "7th Main, Indiranagar, Bengaluru",
      },
    });
    donorId = donor.id;
    donorToken = generateTokens({ userId: donor.id, role: Role.DONOR, email: donor.email }).accessToken;

    // 3. Create NGO (Approved)
    const ngoOwner = await prisma.user.create({
      data: {
        name: "Phase 4 NGO Director",
        email: `ngo.phase4.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.NGO,
        status: UserStatus.ACTIVE,
      },
    });
    ngoOwnerId = ngoOwner.id;
    const ngo = await prisma.ngo.create({
      data: {
        ownerId: ngoOwner.id,
        name: "Seva Care Foundation",
        officialEmail: `contact.phase4.${Date.now()}@sevacare.org`,
        contactNumber: "+91 9988776655",
        address: "Koramangala, Bengaluru",
        latitude: 12.9352,
        longitude: 77.6245,
        verificationStatus: NgoVerificationStatus.APPROVED,
      },
    });
    ngoId = ngo.id;
    ngoToken = generateTokens({ userId: ngoOwner.id, role: Role.NGO, email: ngoOwner.email }).accessToken;

    // 4. Create Volunteer with VolunteerProfile
    const volunteerUser = await prisma.user.create({
      data: {
        name: "Rohan Volunteer",
        email: `volunteer.phase4.${Date.now()}@example.com`,
        passwordHash: "hash123",
        role: Role.VOLUNTEER,
        status: UserStatus.ACTIVE,
        phone: "+91 9123456789",
      },
    });
    volunteerUserId = volunteerUser.id;
    const volunteerProfile = await prisma.volunteerProfile.create({
      data: {
        userId: volunteerUser.id,
        availability: true,
        vehicleType: "Motorcycle",
      },
    });
    volunteerProfileId = volunteerProfile.id;
    volunteerToken = generateTokens({ userId: volunteerUser.id, role: Role.VOLUNTEER, email: volunteerUser.email }).accessToken;
  });

  it("Full Lifecycle: PENDING -> APPROVED -> ASSIGNED -> PICKED_UP -> DELIVERED", async () => {
    // Step 1: Donor creates PENDING donation
    const createDonationRes = await request(app)
      .post("/api/v1/donations")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        categoryId,
        description: "5 cartons of children educational books",
        quantity: 5,
        unit: "cartons",
        pickupAddress: "7th Main, Indiranagar, Bengaluru",
      });

    expect(createDonationRes.status).toBe(201);
    donationId = createDonationRes.body.data.donation.id;
    expect(createDonationRes.body.data.donation.status).toBe(DonationStatus.PENDING);

    // Step 2: NGO accepts donation -> APPROVED
    const acceptRes = await request(app)
      .post(`/api/v1/ngo/donations/${donationId}/accept`)
      .set("Authorization", `Bearer ${ngoToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.donation.status).toBe(DonationStatus.APPROVED);

    // Step 3: NGO fetches volunteer roster
    const rosterRes = await request(app)
      .get("/api/v1/ngo/volunteers")
      .set("Authorization", `Bearer ${ngoToken}`);

    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data.volunteers.length).toBeGreaterThan(0);

    // Step 4: NGO assigns volunteer -> ASSIGNED
    const assignRes = await request(app)
      .post(`/api/v1/ngo/donations/${donationId}/assign`)
      .set("Authorization", `Bearer ${ngoToken}`)
      .send({
        volunteerId: volunteerProfileId,
        notes: "Ring doorbell twice at pickup",
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.donation.status).toBe(DonationStatus.ASSIGNED);
    assignmentId = assignRes.body.data.assignment.id;

    // Step 5: Volunteer sees task with donor details
    const tasksRes = await request(app)
      .get("/api/v1/volunteer/tasks")
      .set("Authorization", `Bearer ${volunteerToken}`);

    expect(tasksRes.status).toBe(200);
    expect(tasksRes.body.data.tasks.length).toBeGreaterThan(0);
    const assignedTask = tasksRes.body.data.tasks.find((t: any) => t.id === assignmentId);
    expect(assignedTask).toBeDefined();
    expect(assignedTask.donation.donor.phone).toBe("+91 9876543210");

    // Step 6: Volunteer confirms pickup -> PICKED_UP
    const pickupRes = await request(app)
      .post(`/api/v1/volunteer/tasks/${assignmentId}/pickup`)
      .set("Authorization", `Bearer ${volunteerToken}`);

    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.data.donation.status).toBe(DonationStatus.PICKED_UP);
    expect(pickupRes.body.data.assignment.status).toBe(AssignmentStatus.PICKED_UP);

    // Step 7: Volunteer completes delivery with proof photo -> DELIVERED
    const deliverRes = await request(app)
      .post(`/api/v1/volunteer/tasks/${assignmentId}/deliver`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({
        proofPhotoUrl: "http://localhost:3000/api/v1/files/sample-proof-photo",
        notes: "Delivered directly to warehouse manager",
      });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.data.donation.status).toBe(DonationStatus.DELIVERED);
    expect(deliverRes.body.data.assignment.status).toBe(AssignmentStatus.DELIVERED);
    expect(deliverRes.body.data.receipt).toBeDefined();
    expect(deliverRes.body.data.receipt.receiptNumber).toMatch(/^DC-REC-/);

    // Step 8: Verify NGO Inventory has the delivered items
    const inventoryRes = await request(app)
      .get("/api/v1/ngo/inventory")
      .set("Authorization", `Bearer ${ngoToken}`);

    expect(inventoryRes.status).toBe(200);
    expect(inventoryRes.body.data.inventory.length).toBeGreaterThan(0);
    const addedItem = inventoryRes.body.data.inventory.find((i: any) => i.donationId === donationId);
    expect(addedItem).toBeDefined();
    expect(addedItem.quantity).toBe(5);

    // Step 9: Verify receipt endpoint
    const receiptRes = await request(app)
      .get(`/api/v1/donations/${donationId}/receipt`)
      .set("Authorization", `Bearer ${donorToken}`);

    expect(receiptRes.status).toBe(200);
    expect(receiptRes.body.data.receipt.receiptNumber).toBe(deliverRes.body.data.receipt.receiptNumber);
  }, 30000);
});
