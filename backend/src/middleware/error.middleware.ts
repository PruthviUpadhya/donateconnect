import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppErrorOptions {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, any>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor({ statusCode, code, message, details }: AppErrorOptions) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload or query parameters",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  // 2. Custom Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || {},
      },
    });
    return;
  }

  // 3. Fallback / Unexpected Server Errors (never leak stack or internal details in production)
  const isDev = process.env.NODE_ENV === "development";
  console.error("Unhandled Server Error:", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isDev ? err.message : "An unexpected server error occurred",
      details: isDev ? { stack: err.stack } : {},
    },
  });
}
