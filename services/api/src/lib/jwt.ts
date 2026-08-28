import jwt from "jsonwebtoken";
import type { UserRole } from "@vanta/types";
import { env } from "./env.js";

export interface VantaJwtPayload {
  sub: string; // user id
  vantaId: string;
  roles: UserRole[];
}

export function signToken(payload: VantaJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token: string): VantaJwtPayload {
  // Throws if the token is invalid, expired, or tampered with.
  // Callers are expected to catch this — an invalid token must never
  // be treated as "not present" (fail closed, not open).
  return jwt.verify(token, env.JWT_SECRET) as VantaJwtPayload;
}
