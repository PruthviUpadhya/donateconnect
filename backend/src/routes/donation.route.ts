import { Router } from "express";
import {
  createDonation,
  getMyDonations,
  getDonationById,
  cancelDonation,
  getNearbyNgos,
  getAvailableDonationsForNgo,
  acceptDonation,
  rejectDonation,
  getNgoDonations,
  getCategories,
} from "../controllers/donation.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();

// Public / Donor: Discovery of categories & verified NGOs
router.get("/categories", getCategories);
router.get("/ngos", getNearbyNgos);

// Donor Endpoints
router.post("/donations", authenticate, authorizeRoles(Role.DONOR, Role.ADMIN), createDonation);
router.get("/donations/mine", authenticate, authorizeRoles(Role.DONOR, Role.ADMIN), getMyDonations);
router.get("/donations/:id", authenticate, getDonationById);
router.patch("/donations/:id/cancel", authenticate, cancelDonation);

// NGO Endpoints
router.get(
  "/ngo/donations/available",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getAvailableDonationsForNgo
);
router.post(
  "/ngo/donations/:id/accept",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  acceptDonation
);
router.post(
  "/ngo/donations/:id/reject",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  rejectDonation
);
router.get(
  "/ngo/donations",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getNgoDonations
);

export default router;
