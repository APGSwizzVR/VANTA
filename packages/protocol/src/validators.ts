import { z } from "zod";
import { LIMITS } from "./constants.js";

/**
 * Callsigns are restricted to a conservative alphanumeric set. This
 * intentionally rejects anything that could be used to smuggle
 * control characters or markup into a value that gets rendered
 * client-side on the radar/ATC UI.
 */
export const callsignSchema = z
  .string()
  .trim()
  .min(LIMITS.CALLSIGN_MIN_LENGTH)
  .max(LIMITS.CALLSIGN_MAX_LENGTH)
  .regex(/^[A-Z0-9]+$/, "Callsign must be uppercase letters/numbers only");

export const icaoSchema = z
  .string()
  .trim()
  .length(4)
  .regex(/^[A-Z0-9]{4}$/, "ICAO code must be 4 uppercase alphanumeric characters");

export const latitudeSchema = z.number().min(LIMITS.LATITUDE_MIN).max(LIMITS.LATITUDE_MAX);
export const longitudeSchema = z.number().min(LIMITS.LONGITUDE_MIN).max(LIMITS.LONGITUDE_MAX);
export const altitudeFeetSchema = z
  .number()
  .min(LIMITS.ALTITUDE_MIN_FEET)
  .max(LIMITS.ALTITUDE_MAX_FEET);
export const headingSchema = z.number().min(LIMITS.HEADING_MIN).max(LIMITS.HEADING_MAX);
export const groundSpeedSchema = z.number().min(0).max(LIMITS.GROUND_SPEED_MAX_KTS);
export const verticalSpeedSchema = z
  .number()
  .min(-LIMITS.VERTICAL_SPEED_MAX_FPM)
  .max(LIMITS.VERTICAL_SPEED_MAX_FPM);

/**
 * Aviation VHF COM frequencies. We validate against the standard
 * 118.000–136.975 airband (with 121.500 always implicitly allowed as
 * the emergency frequency) rather than trusting whatever the client sends.
 */
export const frequencyMhzSchema = z
  .number()
  .min(LIMITS.FREQUENCY_MIN_MHZ)
  .max(LIMITS.FREQUENCY_MAX_MHZ)
  .multipleOf(0.005, "Frequency must align to a valid 8.33/25kHz VHF channel step");

export const squawkSchema = z
  .string()
  .regex(/^[0-7]{4}$/, "Squawk must be 4 octal digits (0-7)");

export const transponderModeSchema = z.enum(["OFF", "STANDBY", "ON", "ALT", "GROUND", "IDENT"]);

export const comRadioStateSchema = z.object({
  active: frequencyMhzSchema,
  standby: frequencyMhzSchema,
});

export const atcPositionTypeSchema = z.enum(["DEL", "GND", "TWR", "APP", "DEP", "CTR", "FSS"]);
