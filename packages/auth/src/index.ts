import { db } from "@chiron/db";
import * as schema from "@chiron/db/schema/auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth<BetterAuthOptions>({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [
    process.env.CORS_ORIGIN || "",
    "tauri://localhost", // Allow Tauri app
    "http://localhost:3001", // Allow web dev
    "http://localhost:3002", // Allow Vite alternative ports
    "http://localhost:3003",
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});
