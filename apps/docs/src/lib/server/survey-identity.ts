import { createHash, randomBytes } from "node:crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function createParticipantRef(emailHash: string): string {
  return `pt_${emailHash.slice(0, 24)}`;
}

export function createSurveySessionId(): string {
  return `ssn_${randomBytes(16).toString("hex")}`;
}

export function isEmailLike(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
