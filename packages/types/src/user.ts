export type UserRole = "PILOT" | "ATC" | "ADMIN" | "MODERATOR";

export type ModerationStatus = "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED";

export interface UserProfile {
  id: string;
  vantaId: string; // short, human-facing unique ID, e.g. "VLR-104233"
  username: string;
  displayName: string;
  roles: UserRole[];
  moderationStatus: ModerationStatus;
  totalFlightHours: number;
  totalAtcHours: number;
  createdAt: string;
}

export interface AuthenticatedSession {
  userId: string;
  vantaId: string;
  roles: UserRole[];
  issuedAt: number;
  expiresAt: number;
}
