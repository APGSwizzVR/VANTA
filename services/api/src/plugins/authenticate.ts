import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@vanta/types";
import { verifyToken } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    vantaUser?: {
      id: string;
      vantaId: string;
      roles: UserRole[];
    };
  }
}

/**
 * Fastify preHandler that verifies the `Authorization: Bearer <token>`
 * header and attaches the decoded identity to the request. Routes
 * that need an authenticated user register this as a preHandler
 * rather than re-implementing token parsing themselves.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken(token);
    request.vantaUser = {
      id: payload.sub,
      vantaId: payload.vantaId,
      roles: payload.roles,
    };
  } catch {
    await reply.code(401).send({ error: "Invalid or expired token" });
  }
}

/**
 * Higher-order preHandler factory: requires the authenticated user to
 * hold at least one of the given roles. Must run after `authenticate`.
 */
export function requireRole(...allowed: UserRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.vantaUser;
    if (!user || !user.roles.some((role) => allowed.includes(role))) {
      await reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}
