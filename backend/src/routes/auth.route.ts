import { Router } from "express";
import {
  register,
  registerNgo,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  getMe,
  updateMe,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public Authentication Endpoints
router.post("/register", register);
router.post("/register-ngo", registerNgo);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected User Profile Endpoints
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);

export default router;
