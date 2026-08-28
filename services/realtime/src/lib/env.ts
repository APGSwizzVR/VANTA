import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
  REALTIME_HOST: z.string().default("0.0.0.0"),
  REALTIME_JWT_SECRET: z.string().min(16).default("vanta-local-development-secret"),
  REALTIME_ALLOW_DEV_AUTH: z.coerce.boolean().default(true),
  REALTIME_MAX_UPDATE_HZ: z.coerce.number().positive().default(2),
  REALTIME_HEARTBEAT_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(30),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { console.error("Invalid environment configuration:\n", parsed.error.format()); process.exit(1); }
export const env = parsed.data;
