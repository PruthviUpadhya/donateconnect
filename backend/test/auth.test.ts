import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { prisma } from "../src/db/prisma";
import { hashOtp } from "../src/services/otp.service";

describe("Phase 2 Authentication & OTP Tests", () => {
  const testDonorEmail = `test.donor.${Date.now()}@example.com`;
  const testNgoEmail = `test.ngo.owner.${Date.now()}@example.com`;
  const testNgoOfficialEmail = `official.ngo.${Date.now()}@example.com`;

  it("POST /api/v1/auth/register registers donor and sends OTP", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test Donor",
      email: testDonorEmail,
      password: "Password123!",
      role: "DONOR",
      phone: "+91 9876543210",
      address: "123 Volunteer Street",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testDonorEmail);
    expect(res.body.data.user.status).toBe("PENDING");

    // Verify OTP was persisted in Neon as hashed value
    const otp = await prisma.otpCode.findFirst({
      where: { user: { email: testDonorEmail } },
      orderBy: { createdAt: "desc" },
    });
    expect(otp).toBeDefined();
    expect(otp?.attempts).toBe(0);
    expect(otp?.consumedAt).toBeNull();
  });

  it("POST /api/v1/auth/verify-otp fails on incorrect code and increments attempts", async () => {
    const res = await request(app).post("/api/v1/auth/verify-otp").send({
      email: testDonorEmail,
      code: "000000",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INCORRECT_OTP");

    const otp = await prisma.otpCode.findFirst({
      where: { user: { email: testDonorEmail } },
      orderBy: { createdAt: "desc" },
    });
    expect(otp?.attempts).toBe(1);
  });

  it("POST /api/v1/auth/verify-otp activates user on valid code and returns JWTs", async () => {
    // Inject known test OTP code directly into hashed storage
    const knownCode = "654321";
    const otp = await prisma.otpCode.findFirst({
      where: { user: { email: testDonorEmail } },
      orderBy: { createdAt: "desc" },
    });

    await prisma.otpCode.update({
      where: { id: otp!.id },
      data: { codeHash: hashOtp(knownCode) },
    });

    const res = await request(app).post("/api/v1/auth/verify-otp").send({
      email: testDonorEmail,
      code: knownCode,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe("ACTIVE");
    expect(res.body.data.tokens).toHaveProperty("accessToken");
    expect(res.body.data.tokens).toHaveProperty("refreshToken");

    // Test access to /api/v1/auth/me with the access token
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.data.tokens.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testDonorEmail);
  });

  it("POST /api/v1/auth/register-ngo registers NGO with PENDING verification status", async () => {
    const res = await request(app).post("/api/v1/auth/register-ngo").send({
      ownerName: "NGO Director",
      email: testNgoEmail,
      password: "Password123!",
      ngoName: "Hope Foundation",
      officialEmail: testNgoOfficialEmail,
      contactNumber: "+91 9988776655",
      address: "456 Charity Lane, Bengaluru",
      registrationCertificateUrl: "https://example.com/cert.pdf",
      panCardUrl: "https://example.com/pan.jpg",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.ngo.verificationStatus).toBe("PENDING");
  });
});
