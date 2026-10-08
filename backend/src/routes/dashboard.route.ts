import { Router } from "express";
import {
  getDonorDashboard,
  getNgoReports,
  getNgoBeneficiaryRequests,
  createBeneficiaryRequest,
  matchDonationToRequest,
  createComplaint,
  getMyComplaints,
} from "../controllers/dashboard.controller";
import {
  getAdminStats,
  getPendingNgos,
  verifyNgo,
  getAllUsers,
  updateUserStatus,
  getAllDonationsForAdmin,
  getAllComplaints,
  resolveComplaint,
  getAuditLogs,
} from "../controllers/admin.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();

// Donor Dashboard
router.get(
  "/donor/dashboard",
  authenticate,
  authorizeRoles(Role.DONOR, Role.ADMIN),
  getDonorDashboard
);

// NGO Operations, Reports & Beneficiary Requests
router.get(
  "/ngo/reports",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getNgoReports
);

router.get(
  "/ngo/requests",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  getNgoBeneficiaryRequests
);

router.post(
  "/ngo/requests",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  createBeneficiaryRequest
);

router.post(
  "/ngo/matches",
  authenticate,
  authorizeRoles(Role.NGO, Role.ADMIN),
  matchDonationToRequest
);

// Complaints & Grievances
router.post("/complaints", authenticate, createComplaint);
router.get("/complaints/mine", authenticate, getMyComplaints);

// Admin Routes (Strict ADMIN role only)
router.get(
  "/admin/stats",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getAdminStats
);

router.get(
  "/admin/ngos/pending",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getPendingNgos
);

router.post(
  "/admin/ngos/:id/verify",
  authenticate,
  authorizeRoles(Role.ADMIN),
  verifyNgo
);

router.get(
  "/admin/users",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getAllUsers
);

router.patch(
  "/admin/users/:id/status",
  authenticate,
  authorizeRoles(Role.ADMIN),
  updateUserStatus
);

router.get(
  "/admin/donations",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getAllDonationsForAdmin
);

router.get(
  "/admin/complaints",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getAllComplaints
);

router.post(
  "/admin/complaints/:id/resolve",
  authenticate,
  authorizeRoles(Role.ADMIN),
  resolveComplaint
);

router.get(
  "/admin/audit-logs",
  authenticate,
  authorizeRoles(Role.ADMIN),
  getAuditLogs
);

export default router;
