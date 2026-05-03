import { db } from "@chiron/db";
import * as schema from "@chiron/db/schema/auth";
import { env } from "@chiron/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN, "null"],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.CORS_ORIGIN === "null" ? "lax" : "none",
      secure: env.CORS_ORIGIN === "null" ? false : true,
      httpOnly: true,
    },
  },
  plugins: [],
});
