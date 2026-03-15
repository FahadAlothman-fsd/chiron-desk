import { randomBytes } from "node:crypto";

export type RuntimeSecrets = {
  betterAuthSecret: string;
};

export function createSecrets(): RuntimeSecrets {
  return {
    betterAuthSecret: randomBytes(32).toString("hex"),
  };
}

export function readSecrets(secrets: unknown): RuntimeSecrets {
  if (!isRuntimeSecrets(secrets)) {
    throw new Error("Invalid runtime secrets payload");
  }

  return {
    betterAuthSecret: secrets.betterAuthSecret,
  };
}

function isRuntimeSecrets(secrets: unknown): secrets is RuntimeSecrets {
  if (!secrets || typeof secrets !== "object") {
    return false;
  }

  const candidate = secrets as { betterAuthSecret?: unknown };

  return typeof candidate.betterAuthSecret === "string" && candidate.betterAuthSecret.length > 0;
}
