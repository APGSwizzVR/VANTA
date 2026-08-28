/** Current wire protocol identifier, sent in every CONNECT message. */
export const PROTOCOL_VERSION = "VANTA/1" as const;

/**
 * Server-enforced bounds used by the Zod schemas below. Keeping these
 * as named constants means the realtime server and any future
 * documentation stay in sync with what's actually validated.
 */
export const LIMITS = {
  CALLSIGN_MIN_LENGTH: 2,
  CALLSIGN_MAX_LENGTH: 12,
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180,
  ALTITUDE_MIN_FEET: -1500, // below Dead Sea level, generous floor
  ALTITUDE_MAX_FEET: 60000,
  HEADING_MIN: 0,
  HEADING_MAX: 359.9,
  GROUND_SPEED_MAX_KTS: 900,
  VERTICAL_SPEED_MAX_FPM: 12000,
  FREQUENCY_MIN_MHZ: 118.0,
  FREQUENCY_MAX_MHZ: 137.0,
  EMERGENCY_FREQUENCY_MHZ: 121.5,
  SQUAWK_MIN: 0,
  SQUAWK_MAX: 7777,
} as const;
