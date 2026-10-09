import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { prisma } from "./db/prisma";
import healthRouter from "./routes/health.route";
import authRouter from "./routes/auth.route";
import uploadRouter from "./routes/upload.route";
import fileRouter from "./routes/file.route";
import donationRouter from "./routes/donation.route";
import volunteerRouter from "./routes/volunteer.route";
import dashboardRouter from "./routes/dashboard.route";
import collaborationRouter from "./routes/collaboration.route";
import impactRouter from "./routes/impact.route";
import { errorMiddleware } from "./middleware/error.middleware";


const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    credentials: true,
  })
);

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP, please try again later",
    },
  },
});
app.use(globalLimiter);

// Body Parsers with limits
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Root health & status endpoints
app.use(healthRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "DonateConnect API",
    version: "1.0.0",
    status: "online",
    docs: "/api/v1",
  });
});

// Base API v1 Router
const apiV1Router = express.Router();
apiV1Router.use(healthRouter); // /api/v1/health
apiV1Router.use("/auth", authRouter); // /api/v1/auth/*
apiV1Router.use("/uploads", uploadRouter); // /api/v1/uploads
apiV1Router.use("/files", fileRouter); // /api/v1/files/:id
apiV1Router.use(donationRouter); // /api/v1/donations, /api/v1/ngos, /api/v1/ngo/donations/*
apiV1Router.use(volunteerRouter); // /api/v1/volunteer/*, /api/v1/ngo/volunteers, /api/v1/ngo/inventory
apiV1Router.use(dashboardRouter); // /api/v1/donor/dashboard, /api/v1/ngo/reports, /api/v1/admin/*
apiV1Router.use(collaborationRouter); // /api/v1/ratings, /api/v1/chat/*, /api/v1/ngo/team, /api/v1/ngo/notes, /api/v1/ngo/analytics
apiV1Router.use(impactRouter); // /api/v1/impact/*

apiV1Router.get("/", (req: Request, res: Response) => {
  res.json({
    message: "DonateConnect API v1",
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      donor: "/api/v1/donor",
      ngo: "/api/v1/ngo",
      volunteer: "/api/v1/volunteer",
      admin: "/api/v1/admin",
    },
  });
});

app.use("/api/v1", apiV1Router);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized Error Middleware
app.use(errorMiddleware);

const startServer = async () => {
  try {
    // Initial verification of Prisma connection to Neon
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Successfully connected to PostgreSQL (Neon) via Prisma ORM");

    app.listen(config.port, () => {
      console.log(`🚀 DonateConnect Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to database on startup:", error);
    process.exit(1);
  }
};

startServer();

export default app;