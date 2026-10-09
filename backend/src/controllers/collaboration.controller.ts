import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { RatingKind, Role, NgoTeamRole } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { createNotification } from "../services/notification.service";

// Validation Schemas
export const createRatingSchema = z.object({
  donationId: z.string().uuid("Invalid donation UUID"),
  kind: z.enum(["DONOR_TO_NGO", "NGO_TO_DONOR", "DONOR_TO_VOLUNTEER", "NGO_TO_VOLUNTEER"]),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const createInternalNoteSchema = z.object({
  donationId: z.string().uuid().optional(),
  body: z.string().min(2, "Note body is required"),
});

export const addTeamMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  teamRole: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
});

export const updateTeamMemberSchema = z.object({
  teamRole: z.enum(["MANAGER", "STAFF"]),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, "Message content cannot be empty").optional(),
  content: z.string().min(1, "Message content cannot be empty").optional(),
}).refine((data) => data.body || data.content, {
  message: "Message content cannot be empty",
  path: ["body"],
}).transform((data) => ({
  body: (data.body || data.content)!.trim(),
}));

// Helper: resolve user's NGO with role verification
async function resolveNgoContext(userId: string) {
  // Check if owner
  const ownedNgo = await prisma.ngo.findUnique({
    where: { ownerId: userId },
  });
  if (ownedNgo) {
    return { ngo: ownedNgo, teamRole: NgoTeamRole.OWNER };
  }

  // Check if team member
  const member = await prisma.ngoMember.findFirst({
    where: { userId },
    include: { ngo: true },
  });
  if (member) {
    return { ngo: member.ngo, teamRole: member.teamRole };
  }

  throw new AppError({
    statusCode: 403,
    code: "NOT_NGO_MEMBER",
    message: "You are not affiliated with an authorized NGO organization",
  });
}

/**
 * 1. RATINGS & REPUTATION
 * POST /api/v1/ratings
 * GET /api/v1/ratings/received
 */
export const createRating = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createRatingSchema.parse(req.body);
    const fromUserId = req.user!.userId;

    // Verify donation exists and is delivered
    const donation = await prisma.donation.findUnique({
      where: { id: data.donationId },
      include: {
        acceptedByNgo: true,
        assignments: {
          where: { status: "DELIVERED" },
          include: { volunteer: { include: { user: true } } },
        },
      },
    });

    if (!donation) {
      throw new AppError({ statusCode: 404, code: "DONATION_NOT_FOUND", message: "Donation not found" });
    }

    if (donation.status !== "DELIVERED") {
      throw new AppError({
        statusCode: 400,
        code: "DONATION_NOT_DELIVERED",
        message: "Ratings can only be submitted after successful delivery",
      });
    }

    let targetUserId: string | null = null;
    let targetNgoId: string | null = null;

    if (data.kind === "DONOR_TO_NGO") {
      if (donation.donorId !== fromUserId) {
        throw new AppError({ statusCode: 403, code: "UNAUTHORIZED_RATING", message: "Only the donor can rate the receiving NGO" });
      }
      targetNgoId = donation.acceptedByNgoId;
    } else if (data.kind === "NGO_TO_DONOR") {
      const { ngo } = await resolveNgoContext(fromUserId);
      if (donation.acceptedByNgoId !== ngo.id) {
        throw new AppError({ statusCode: 403, code: "UNAUTHORIZED_RATING", message: "Only the recipient NGO can rate the donor" });
      }
      targetUserId = donation.donorId;
    } else if (data.kind === "DONOR_TO_VOLUNTEER") {
      if (donation.donorId !== fromUserId) {
        throw new AppError({ statusCode: 403, code: "UNAUTHORIZED_RATING", message: "Only the donor can rate the delivery volunteer" });
      }
      const delivery = donation.assignments[0];
      if (!delivery) {
        throw new AppError({ statusCode: 400, code: "NO_VOLUNTEER_ASSIGNED", message: "No delivery volunteer on record" });
      }
      targetUserId = delivery.volunteer.userId;
    } else if (data.kind === "NGO_TO_VOLUNTEER") {
      const { ngo } = await resolveNgoContext(fromUserId);
      if (donation.acceptedByNgoId !== ngo.id) {
        throw new AppError({ statusCode: 403, code: "UNAUTHORIZED_RATING", message: "Only the recipient NGO can rate the volunteer" });
      }
      const delivery = donation.assignments[0];
      if (!delivery) {
        throw new AppError({ statusCode: 400, code: "NO_VOLUNTEER_ASSIGNED", message: "No delivery volunteer on record" });
      }
      targetUserId = delivery.volunteer.userId;
    }

    // Upsert rating
    const rating = await prisma.$transaction(async (tx) => {
      const saved = await tx.rating.upsert({
        where: {
          donationId_kind_fromUserId: {
            donationId: data.donationId,
            kind: data.kind as RatingKind,
            fromUserId,
          },
        },
        update: {
          score: data.score,
          comment: data.comment,
        },
        create: {
          donationId: data.donationId,
          kind: data.kind as RatingKind,
          fromUserId,
          targetUserId,
          targetNgoId,
          score: data.score,
          comment: data.comment,
        },
      });

      // Update volunteer profile avg if rating was for a volunteer
      if (targetUserId) {
        const vProfile = await tx.volunteerProfile.findUnique({ where: { userId: targetUserId } });
        if (vProfile) {
          const allVratings = await tx.rating.findMany({
            where: { targetUserId, kind: { in: ["DONOR_TO_VOLUNTEER", "NGO_TO_VOLUNTEER"] } },
          });
          const avg = allVratings.reduce((acc, r) => acc + r.score, 0) / allVratings.length;
          await tx.volunteerProfile.update({
            where: { id: vProfile.id },
            data: {
              ratingAvg: Number(avg.toFixed(2)),
              ratingCount: allVratings.length,
            },
          });
        }
      }

      return saved;
    });

    res.status(201).json({
      success: true,
      message: "Feedback rating recorded successfully",
      data: { rating },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyRatingsReceived = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let ratings: any[] = [];
    if (userRole === Role.NGO) {
      const ngo = await prisma.ngo.findFirst({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      });
      if (ngo) {
        ratings = await prisma.rating.findMany({
          where: { targetNgoId: ngo.id },
          include: { fromUser: { select: { id: true, name: true } }, donation: { select: { id: true, quantity: true, unit: true } } },
          orderBy: { createdAt: "desc" },
        });
      }
    } else {
      ratings = await prisma.rating.findMany({
        where: { targetUserId: userId },
        include: { fromUser: { select: { id: true, name: true } }, donation: { select: { id: true, quantity: true, unit: true } } },
        orderBy: { createdAt: "desc" },
      });
    }

    res.status(200).json({
      success: true,
      data: { ratings },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. VOLUNTEER REWARD EVENTS
 * GET /api/v1/volunteer/rewards
 */
export const getVolunteerRewards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.volunteerProfile.findUnique({
      where: { userId },
    });

    const rewardEvents = await prisma.rewardEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: {
        totalKarma: profile?.rewardPoints || 0,
        tasksCompleted: profile?.tasksCompleted || 0,
        ratingAvg: profile?.ratingAvg || 5.0,
        events: rewardEvents,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. CHAT THREADS & MESSAGING
 * GET /api/v1/chat/threads
 * POST /api/v1/chat/threads
 * GET /api/v1/chat/threads/:id/messages
 * POST /api/v1/chat/threads/:id/messages
 */
export const getChatThreads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let whereClause: any = {};
    if (userRole === Role.DONOR) {
      whereClause = { donation: { donorId: userId } };
    } else if (userRole === Role.NGO) {
      const ngo = await prisma.ngo.findFirst({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      });
      whereClause = { donation: { acceptedByNgoId: ngo?.id || "" } };
    } else if (userRole === Role.VOLUNTEER) {
      whereClause = { donation: { assignments: { some: { volunteer: { userId } } } } };
    }

    const threads = await prisma.chatThread.findMany({
      where: whereClause,
      include: {
        donation: {
          select: {
            id: true,
            quantity: true,
            unit: true,
            status: true,
            category: { select: { name: true } },
            donor: { select: { id: true, name: true } },
            acceptedByNgo: { select: { id: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { threads },
    });
  } catch (err) {
    next(err);
  }
};

export const createOrGetChatThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const donationId = req.body.donationId;
    if (!donationId) {
      throw new AppError({ statusCode: 400, code: "MISSING_DONATION_ID", message: "donationId is required" });
    }

    let thread = await prisma.chatThread.findFirst({
      where: { donationId },
      include: {
        donation: {
          select: {
            id: true,
            quantity: true,
            unit: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: { donationId },
        include: {
          donation: {
            select: {
              id: true,
              quantity: true,
              unit: true,
              category: { select: { name: true } },
            },
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { thread },
    });
  } catch (err) {
    next(err);
  }
};

export const getThreadMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const threadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (err) {
    next(err);
  }
};

export const postMessageToThread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const threadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = sendMessageSchema.parse(req.body);
    const senderId = req.user!.userId;

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        senderId,
        body: data.body,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. NGO INTERNAL NOTES
 * GET /api/v1/ngo/notes
 * POST /api/v1/ngo/notes
 */
export const getNgoInternalNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo } = await resolveNgoContext(req.user!.userId);
    const donationId = req.query.donationId as string | undefined;

    const notes = await prisma.internalNote.findMany({
      where: {
        ngoId: ngo.id,
        ...(donationId ? { donationId } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        donation: { select: { id: true, quantity: true, unit: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: { notes },
    });
  } catch (err) {
    next(err);
  }
};

export const createNgoInternalNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo } = await resolveNgoContext(req.user!.userId);
    const data = createInternalNoteSchema.parse(req.body);

    const note = await prisma.internalNote.create({
      data: {
        ngoId: ngo.id,
        authorId: req.user!.userId,
        donationId: data.donationId || null,
        body: data.body,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Internal organization note saved",
      data: { note },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. NGO TEAM MANAGEMENT
 * GET /api/v1/ngo/team
 * POST /api/v1/ngo/team
 * PATCH /api/v1/ngo/team/:id
 */
export const getNgoTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo } = await resolveNgoContext(req.user!.userId);

    const members = await prisma.ngoMember.findMany({
      where: { ngoId: ngo.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      success: true,
      data: {
        owner: await prisma.user.findUnique({
          where: { id: ngo.ownerId },
          select: { id: true, name: true, email: true, phone: true },
        }),
        members,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const addNgoTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo, teamRole } = await resolveNgoContext(req.user!.userId);

    // Only OWNER or MANAGER can add team members
    if (teamRole !== NgoTeamRole.OWNER && teamRole !== NgoTeamRole.MANAGER) {
      throw new AppError({ statusCode: 403, code: "UNAUTHORIZED_TEAM_ACTION", message: "Only NGO Owners or Managers can manage staff" });
    }

    const data = addTeamMemberSchema.parse(req.body);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone || null,
          passwordHash: "temp_invite_hash",
          role: Role.NGO,
          status: "ACTIVE",
        },
      });
    }

    // Check membership
    const existing = await prisma.ngoMember.findUnique({
      where: { ngoId_userId: { ngoId: ngo.id, userId: user.id } },
    });
    if (existing) {
      throw new AppError({ statusCode: 400, code: "ALREADY_MEMBER", message: "User is already a member of this NGO team" });
    }

    const member = await prisma.ngoMember.create({
      data: {
        ngoId: ngo.id,
        userId: user.id,
        teamRole: data.teamRole as NgoTeamRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: `Added ${user.name} to NGO team as ${data.teamRole}`,
      data: { member },
    });
  } catch (err) {
    next(err);
  }
};

export const updateNgoTeamMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo, teamRole } = await resolveNgoContext(req.user!.userId);
    if (teamRole !== NgoTeamRole.OWNER) {
      throw new AppError({ statusCode: 403, code: "OWNER_ONLY", message: "Only the NGO Owner can change roles" });
    }

    const memberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = updateTeamMemberSchema.parse(req.body);

    const updated = await prisma.ngoMember.update({
      where: { id: memberId },
      data: { teamRole: data.teamRole as NgoTeamRole },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: "Team member role updated",
      data: { member: updated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. ADVANCED DONATION ANALYTICS
 * GET /api/v1/ngo/analytics
 */
export const getNgoAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngo } = await resolveNgoContext(req.user!.userId);

    // Distribution by Category
    const donations = await prisma.donation.findMany({
      where: { acceptedByNgoId: ngo.id },
      include: { category: true },
    });

    const categoryBreakdown: Record<string, { count: number; quantity: number }> = {};
    donations.forEach((d) => {
      const cat = d.category.name;
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, quantity: 0 };
      }
      categoryBreakdown[cat].count += 1;
      categoryBreakdown[cat].quantity += d.quantity;
    });

    // Fulfilled requests ratio
    const totalRequests = await prisma.beneficiaryRequest.count({ where: { ngoId: ngo.id } });
    const fulfilledRequests = await prisma.beneficiaryRequest.count({
      where: { ngoId: ngo.id, status: "FULFILLED" },
    });

    // Average turnaround time (acceptance to delivery)
    const deliveredDonations = donations.filter((d) => d.status === "DELIVERED");

    res.status(200).json({
      success: true,
      data: {
        totalReceived: donations.length,
        deliveredRate: donations.length > 0 ? Number(((deliveredDonations.length / donations.length) * 100).toFixed(1)) : 0,
        requestsFulfillmentRate: totalRequests > 0 ? Number(((fulfilledRequests / totalRequests) * 100).toFixed(1)) : 100,
        categoryBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};
