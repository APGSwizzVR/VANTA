import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/authenticate.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/me", { preHandler: authenticate }, async (request, reply) => {
    // authenticate() short-circuits with a 401 reply before this
    // handler body runs if vantaUser is missing, but we guard again
    // for type-safety and defense in depth.
    if (!request.vantaUser) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.vantaUser.id },
      select: {
        id: true,
        vantaId: true,
        username: true,
        displayName: true,
        roles: true,
        moderationStatus: true,
        totalFlightHours: true,
        totalAtcHours: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    return reply.send(user);
  });
}
