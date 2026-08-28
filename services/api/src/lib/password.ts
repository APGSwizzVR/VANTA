import argon2 from "argon2";
import { env } from "./env.js";

/**
 * Hash a plaintext password with argon2id. Passwords are never stored
 * in plaintext or with a reversible cipher anywhere in Vanta.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // A malformed hash (e.g. corrupted data) must never crash the
    // login flow — treat it as "does not match".
    return false;
  }
}
