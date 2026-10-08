import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  try {
    // Graceful Neon cold-start query check via Prisma
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    console.error("Health Check Database Error:", error);

    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      error: isDev && error instanceof Error ? error.message : "Database connection failed",
    });
  }
});

export default router;
