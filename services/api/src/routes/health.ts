import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch (error) {
      app.log.error({ error }, "Health check failed: database unreachable");
      return reply.code(503).send({ status: "degraded", database: "unreachable" });
    }
  });
}
