import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
}

export function generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: "7d",
  });

  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: "30d",
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
}
