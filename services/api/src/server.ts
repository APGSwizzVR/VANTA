import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { disconnectPrisma } from "./lib/prisma.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { airportRoutes } from "./routes/airports.js";
import { flightPlanRoutes } from "./routes/flight-plans.js";
import { atcPositionRoutes } from "./routes/atc-positions.js";

async function buildServer() {
  const app = Fastify({ logger, trustProxy: true });

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  // Global rate limit as a baseline abuse protection. Individual
  // routes (e.g. /auth/login) can layer tighter limits on top later.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "Unhandled error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: statusCode === 500 ? "Internal server error" : error.message,
    });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(airportRoutes);
  await app.register(flightPlanRoutes);
  await app.register(atcPositionRoutes);

  return app;
}

async function main() {
  const app = await buildServer();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down API server");
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info(`Vanta API listening on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (error) {
    logger.error({ error }, "Failed to start API server");
    process.exit(1);
  }
}

void main();
