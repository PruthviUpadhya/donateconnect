import { Router } from "express";
import {
  createRating,
  getMyRatingsReceived,
  getVolunteerRewards,
  getChatThreads,
  createOrGetChatThread,
  getThreadMessages,
  postMessageToThread,
  getNgoInternalNotes,
  createNgoInternalNote,
  getNgoTeam,
  addNgoTeamMember,
  updateNgoTeamMember,
  getNgoAnalytics,
} from "../controllers/collaboration.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();

// 1. Ratings & Reputation
router.post("/ratings", authenticate, createRating);
router.get("/ratings/received", authenticate, getMyRatingsReceived);

// 2. Volunteer Rewards
router.get("/volunteer/rewards", authenticate, authorizeRoles(Role.VOLUNTEER, Role.ADMIN), getVolunteerRewards);

// 3. Chat Threads & Messages
router.get("/chat/threads", authenticate, getChatThreads);
router.post("/chat/threads", authenticate, createOrGetChatThread);
router.get("/chat/threads/:id/messages", authenticate, getThreadMessages);
router.post("/chat/threads/:id/messages", authenticate, postMessageToThread);

// 4. NGO Internal Notes
router.get("/ngo/notes", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), getNgoInternalNotes);
router.post("/ngo/notes", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), createNgoInternalNote);

// 5. NGO Team Management
router.get("/ngo/team", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), getNgoTeam);
router.post("/ngo/team", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), addNgoTeamMember);
router.patch("/ngo/team/:id", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), updateNgoTeamMember);

// 6. Donation Analytics
router.get("/ngo/analytics", authenticate, authorizeRoles(Role.NGO, Role.ADMIN), getNgoAnalytics);

export default router;
