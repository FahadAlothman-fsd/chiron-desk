import { describe, expect, it } from "vitest";

import { buildServerEnv } from "../../runtime-env";

describe("buildServerEnv", () => {
  it("derives required packaged server environment", () => {
    const env = buildServerEnv({
      config: {
        version: 1,
        mode: "local",
        server: { kind: "bundled", port: 43110 },
        database: { kind: "local", url: "file:/tmp/chiron.db" },
      },
      secrets: { betterAuthSecret: "secret" },
      rendererOrigin: "http://127.0.0.1:3001",
    });

    expect(env.DATABASE_URL).toBe("file:/tmp/chiron.db");
    expect(env.BETTER_AUTH_SECRET).toBe("secret");
    expect(env.BETTER_AUTH_URL).toBe("http://127.0.0.1:43110");
    expect(env.CORS_ORIGIN).toBe("http://127.0.0.1:3001");
  });
});
