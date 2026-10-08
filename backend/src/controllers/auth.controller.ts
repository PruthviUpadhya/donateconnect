import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { Role, UserStatus, NgoVerificationStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { otpService } from "../services/otp.service";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";

// 1. Validation Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["DONOR", "VOLUNTEER"]),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const registerNgoSchema = z.object({
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ngoName: z.string().min(2, "NGO name must be at least 2 characters"),
  officialEmail: z.string().email("Invalid official email address"),
  contactNumber: z.string().min(7, "Contact number is required"),
  address: z.string().min(5, "Physical NGO address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  registrationCertificateUrl: z.string().min(1, "Registration certificate is required"),
  panCardUrl: z.string().min(1, "PAN card document is required"),
  addressProofUrl: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.string().default("EMAIL_VERIFICATION"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.string().default("EMAIL_VERIFICATION"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// 2. Controller Handlers
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    // Prevent duplicate emails
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError({
        statusCode: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email address already exists",
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role as Role,
        phone: data.phone,
        address: data.address,
        status: UserStatus.PENDING,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // If volunteer, create VolunteerProfile
    if (data.role === "VOLUNTEER") {
      await prisma.volunteerProfile.create({
        data: { userId: user.id },
      });
    }

    // Trigger OTP sending
    await otpService.createAndSendOtp(user.id, user.email, "EMAIL_VERIFICATION");

    res.status(201).json({
      success: true,
      message: "Registration successful. Verification code has been sent to your email.",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const registerNgo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerNgoSchema.parse(req.body);

    // Verify email uniqueness for both user and NGO
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new AppError({
        statusCode: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email address already exists",
      });
    }

    const existingNgo = await prisma.ngo.findUnique({ where: { officialEmail: data.officialEmail } });
    if (existingNgo) {
      throw new AppError({
        statusCode: 409,
        code: "NGO_EMAIL_ALREADY_EXISTS",
        message: "An NGO is already registered with this official email address",
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          passwordHash,
          role: Role.NGO,
          phone: data.contactNumber,
          address: data.address,
          status: UserStatus.PENDING,
        },
      });

      const ngo = await tx.ngo.create({
        data: {
          ownerId: user.id,
          name: data.ngoName,
          officialEmail: data.officialEmail,
          contactNumber: data.contactNumber,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          websiteUrl: data.websiteUrl || null,
          registrationCertificateUrl: data.registrationCertificateUrl,
          panCardUrl: data.panCardUrl,
          addressProofUrl: data.addressProofUrl,
          verificationStatus: NgoVerificationStatus.PENDING,
        },
      });

      // Add owner as NGO team member with OWNER role
      await tx.ngoMember.create({
        data: {
          ngoId: ngo.id,
          userId: user.id,
          teamRole: "OWNER",
        },
      });

      return { user, ngo };
    });

    // Send verification code
    await otpService.createAndSendOtp(result.user.id, result.user.email, "EMAIL_VERIFICATION");

    res.status(201).json({
      success: true,
      message: "NGO registered successfully. Please verify your email.",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        ngo: {
          id: result.ngo.id,
          name: result.ngo.name,
          verificationStatus: result.ngo.verificationStatus,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = verifyOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { ownedNgo: true },
    });

    if (!user) {
      throw new AppError({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "No user found with this email",
      });
    }

    // Verify OTP code
    await otpService.verifyOtp(user.id, data.purpose, data.code);

    // Activate user & set emailVerifiedAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        ownedNgo: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
          },
        },
      },
    });

    // Issue JWTs
    const tokens = generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: updatedUser,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = resendOtpSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "No user found with this email",
      });
    }

    await otpService.createAndSendOtp(user.id, user.email, data.purpose);

    res.status(200).json({
      success: true,
      message: "A new verification code has been dispatched to your email address",
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { ownedNgo: true },
    });

    if (!user) {
      throw new AppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError({
        statusCode: 403,
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended by administration",
      });
    }

    if (user.status === UserStatus.PENDING && !user.emailVerifiedAt) {
      throw new AppError({
        statusCode: 403,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address with the OTP before logging in",
      });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          ownedNgo: user.ownedNgo
            ? {
                id: user.ownedNgo.id,
                name: user.ownedNgo.name,
                verificationStatus: user.ownedNgo.verificationStatus,
              }
            : null,
        },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(data.refreshToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new AppError({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: { tokens },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        status: true,
        createdAt: true,
        ownedNgo: {
          select: {
            id: true,
            name: true,
            officialEmail: true,
            contactNumber: true,
            address: true,
            verificationStatus: true,
          },
        },
        volunteerProfile: {
          select: {
            id: true,
            availability: true,
            ratingAvg: true,
            tasksCompleted: true,
            rewardPoints: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateMeSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
