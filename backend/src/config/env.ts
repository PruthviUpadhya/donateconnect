import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().default("donateconnect-dev-secret-key-change-in-prod-32bytes!"),
  JWT_REFRESH_SECRET: z.string().default("donateconnect-dev-refresh-secret-key-change-in-prod!"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().default("DonateConnect"),
  CORS_ORIGIN: z.string().default("*"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsedEnv.data;
export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  adminEmail: env.ADMIN_EMAIL,
  adminPassword: env.ADMIN_PASSWORD,
  brevoApiKey: env.BREVO_API_KEY || process.env.BREVO_API_KEY,
  brevoSenderEmail: env.BREVO_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL || "pruthviupadhya31@gmail.com",
  brevoSenderName: env.BREVO_SENDER_NAME || process.env.BREVO_SENDER_NAME || "DonateConnect",
  corsOrigin: env.CORS_ORIGIN,
};

