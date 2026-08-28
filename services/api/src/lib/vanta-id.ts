import { randomInt } from "node:crypto";

/**
 * Generates a candidate Vanta ID. Uniqueness is enforced at the
 * database level (unique constraint) — callers should retry on a
 * collision, which in practice will be exceedingly rare given the
 * 900,000-value space.
 */
export function generateVantaIdCandidate(): string {
  const number = randomInt(100000, 999999);
  return `VNT-${number}`;
}
