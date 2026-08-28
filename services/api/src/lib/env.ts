import "dotenv/config";
import { z } from "zod";

/**
 * All environment variables the API depends on are validated once,
 * at startup, so a missing/malformed value fails loudly and
 * immediately instead of surfacing as a confusing runtime error
 * later (e.g. deep inside a JWT verify call).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  API_CORS_ORIGINS: z.string().default("http://localhost:5173"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("12h"),

  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Intentionally avoid throwing here so we can print a readable
  // summary before exiting, rather than an unhandled Zod error dump.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:\n", parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.API_CORS_ORIGINS.split(",").map((origin) => origin.trim()),
};
