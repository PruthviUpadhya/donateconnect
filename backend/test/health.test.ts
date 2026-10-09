import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index";
import { emailService } from "../src/services/email.service";

describe("Phase 1 Acceptance Tests", () => {
  it("GET /health returns 200 with database: connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("database", "connected");
  });

  it("GET /api/v1/health returns 200 with database: connected", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("database", "connected");
  });

  it("GET / returns 200 with API status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "online");
  });

  it("EmailService provides development fallback without error", async () => {
    const result = await emailService.sendOtpEmail({
      to: "test@example.com",
      otp: "123456",
      expiresInMinutes: 10,
    });
    expect(result.success).toBe(true);
    expect(["resend", "smtp", "console"]).toContain(result.deliveredVia);
  });
});
