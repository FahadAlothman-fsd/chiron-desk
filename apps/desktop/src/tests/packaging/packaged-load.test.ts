import { describe, expect, it } from "vitest";
import {
  resolvePackagedRuntimeContext,
  resolveRendererOrigin,
  resolveRendererTarget,
} from "../../../main";

describe("renderer target resolution in packaged mode", () => {
  it("uses built web assets when no dev server url is present", () => {
    expect(resolveRendererTarget({ appRoot: "/repo/apps/desktop" })).toEqual({
      mode: "file",
      target: "/repo/apps/web/dist/index.html",
    });
  });

  it("uses packaged resources when an AppImage build is running", () => {
    expect(
      resolveRendererTarget({
        appRoot: "/opt/Chiron/resources/app.asar",
        resourcesPath: "/opt/Chiron/resources",
      }),
    ).toEqual({
      mode: "file",
      target: "/opt/Chiron/resources/web-dist/index.html",
    });
  });

  it("derives a packaged renderer origin from the bundled file target", async () => {
    const runtime = await resolvePackagedRuntimeContext({
      appRoot: "/opt/Chiron/resources/app.asar",
      resourcesPath: "/opt/Chiron/resources",
      userDataPath: "/tmp/chiron",
      bootstrapRuntimeState: async () => ({
        paths: {
          runtimeRoot: "/tmp/chiron/runtime",
          configFile: "/tmp/chiron/runtime/config.json",
          secretsFile: "/tmp/chiron/runtime/secrets.json",
          dataDir: "/tmp/chiron/runtime/data",
          databaseFile: "/tmp/chiron/runtime/data/chiron.db",
          logsDir: "/tmp/chiron/runtime/logs",
        },
        config: {
          version: 1,
          mode: "local",
          server: { kind: "bundled", port: 43110 },
          database: {
            kind: "local",
            url: "file:///tmp/chiron/runtime/data/chiron.db",
          },
        },
        secrets: { betterAuthSecret: "secret" },
      }),
    });

    expect(resolveRendererOrigin(runtime.rendererTarget)).toBe("null");
    expect(runtime.runtimeEnv.CORS_ORIGIN).toBe("http://127.0.0.1:43110");
  });
});
