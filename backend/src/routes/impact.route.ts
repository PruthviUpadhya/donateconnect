import { Router } from "express";
import { getImpactEstimate, getDonorLifetimeImpact } from "../controllers/impact.controller";
import { authenticate } from "../middleware/auth.middleware";

const impactRouter = Router();

// Public calculation helper (e.g. while filling out the donation form)
impactRouter.get("/impact/estimate", getImpactEstimate);

// Authenticated donor lifetime impact summary
impactRouter.get("/impact/donor-summary", authenticate, getDonorLifetimeImpact);

export default impactRouter;
