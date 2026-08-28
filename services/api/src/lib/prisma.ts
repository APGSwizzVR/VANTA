import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

/**
 * A single shared Prisma client for the process. Creating a new
 * PrismaClient per request would exhaust the Postgres connection pool
 * under load, so this module is imported everywhere a query is needed.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
