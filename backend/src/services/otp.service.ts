import crypto from "crypto";
import { prisma } from "../db/prisma";
import { emailService } from "./email.service";
import { AppError } from "../middleware/error.middleware";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function generateNumericOtp(): string {
  // Cryptographically secure 6-digit OTP
  return crypto.randomInt(100000, 999999).toString();
}

export class OtpService {
  /**
   * Generates, hashes, stores, and emails an OTP.
   * Rate limits resends within 60 seconds.
   */
  async createAndSendOtp(userId: string, email: string, purpose: string): Promise<{ success: boolean; deliveredVia: "smtp" | "console" }> {
    // Check resend rate limit (last OTP created within 60 seconds)
    const latestOtp = await prisma.otpCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (latestOtp) {
      const secondsSinceLast = Math.floor((Date.now() - latestOtp.createdAt.getTime()) / 1000);
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        throw new AppError({
          statusCode: 429,
          code: "OTP_RATE_LIMITED",
          message: `Please wait ${RESEND_COOLDOWN_SECONDS - secondsSinceLast} seconds before requesting another code`,
        });
      }
    }

    const rawOtp = generateNumericOtp();
    const codeHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Persist hashed OTP
    await prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    // Send real Gmail SMTP email (or dev fallback)
    const result = await emailService.sendOtpEmail({
      to: email,
      otp: rawOtp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    return result;
  }

  /**
   * Validates an OTP code for a user and purpose.
   * Enforces 10-minute expiry, max 5 attempts, and consumes the code on success.
   */
  async verifyOtp(userId: string, purpose: string, submittedCode: string): Promise<boolean> {
    const activeOtp = await prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_OTP",
        message: "No active verification code found. Please request a new code.",
      });
    }

    // 1. Check Max Attempts
    if (activeOtp.attempts >= MAX_ATTEMPTS) {
      throw new AppError({
        statusCode: 400,
        code: "OTP_MAX_ATTEMPTS_EXCEEDED",
        message: "Maximum verification attempts exceeded. Please request a new code.",
      });
    }

    // 2. Check Expiration
    if (new Date() > activeOtp.expiresAt) {
      throw new AppError({
        statusCode: 400,
        code: "OTP_EXPIRED",
        message: "This verification code has expired. Please request a new code.",
      });
    }

    // 3. Check Code Match
    const submittedHash = hashOtp(submittedCode.trim());
    if (submittedHash !== activeOtp.codeHash) {
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_ATTEMPTS - (activeOtp.attempts + 1);
      throw new AppError({
        statusCode: 400,
        code: "INCORRECT_OTP",
        message: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Code locked."}`,
      });
    }

    // 4. Mark Consumed
    await prisma.otpCode.update({
      where: { id: activeOtp.id },
      data: { consumedAt: new Date() },
    });

    return true;
  }
}

export const otpService = new OtpService();
export default otpService;
