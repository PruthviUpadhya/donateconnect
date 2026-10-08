import { Router } from "express";
import {
  getNgoVolunteers,
  assignVolunteerToDonation,
  getVolunteerTasks,
  confirmPickup,
  completeDelivery,
  updateAvailability,
  getNgoInventory,
  getDonationReceipt,
} from "../controllers/volunteer.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();

// NGO Endpoints
router.get(
  "/ngo/volunteers",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getNgoVolunteers
);

router.post(
  "/ngo/donations/:id/assign",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  assignVolunteerToDonation
);

router.get(
  "/ngo/inventory",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getNgoInventory
);

// Volunteer Endpoints
router.get(
  "/volunteer/tasks",
  authenticate,
  authorizeRoles(Role.VOLUNTEER, Role.ADMIN),
  getVolunteerTasks
);

router.post(
  "/volunteer/tasks/:id/pickup",
  authenticate,
  authorizeRoles(Role.VOLUNTEER, Role.ADMIN),
  confirmPickup
);

router.post(
  "/volunteer/tasks/:id/deliver",
  authenticate,
  authorizeRoles(Role.VOLUNTEER, Role.ADMIN),
  completeDelivery
);

router.patch(
  "/volunteer/availability",
  authenticate,
  authorizeRoles(Role.VOLUNTEER, Role.ADMIN),
  updateAvailability
);

// Public / Authenticated Receipt Endpoint
router.get("/donations/:id/receipt", authenticate, getDonationReceipt);

export default router;
