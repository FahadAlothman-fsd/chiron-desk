import { createHmac, timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

export type SurveyLaunchTokenPayload = {
  experimentId: string;
  surveyVersion: string;
  participantRef: string;
  issuedAt: string;
  expiresAt: string;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function createLaunchToken(payload: SurveyLaunchTokenPayload, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyLaunchToken(token: string, secret: string): SurveyLaunchTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SurveyLaunchTokenPayload;

  if (Date.parse(payload.expiresAt) <= Date.now()) {
    return null;
  }

  return payload;
}
