import { Router, Request, Response } from "express";
import { pool } from "../config/db";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query("SELECT 1 AS healthy");
    const isDbConnected = dbResult.rows[0]?.healthy === 1;

    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        server: "up",
        database: isDbConnected ? "connected" : "down",
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        server: "up",
        database: "disconnected",
      },
      error: error instanceof Error ? error.message : "Unknown database error",
    });
  }
});

export default router;
