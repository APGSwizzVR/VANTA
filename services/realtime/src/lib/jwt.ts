import jwt from "jsonwebtoken";
import type { UserRole } from "@vanta/types";
import { env } from "./env.js";

export interface VantaJwtPayload {
  sub: string;
  vantaId: string;
  roles: UserRole[];
}

/**
 * Verifies a token issued by services/api. REALTIME_JWT_SECRET must be
 * set to the same value as the API's JWT_SECRET -- they are separate
 * env vars (rather than one shared var) so the two services can be
 * deployed independently and rotate secrets on their own schedule if
 * ever split onto different infrastructure, while still defaulting to
 * "just copy the same value" for local/single-host setups.
 */
export function verifyToken(token: string): VantaJwtPayload {
  return jwt.verify(token, env.REALTIME_JWT_SECRET) as VantaJwtPayload;
}
