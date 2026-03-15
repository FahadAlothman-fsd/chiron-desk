# Desktop Self-Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the packaged Chiron desktop app self-bootstrap its bundled server and local runtime state with zero external env on first run, while giving the packaged renderer the real runtime backend URL through a desktop bridge.

**Architecture:** `apps/desktop` becomes the packaged bootstrap owner. It creates runtime paths and persisted config under Electron user data, derives the server environment, and starts the bundled server before loading the packaged renderer. In packaged mode, desktop also exposes runtime backend metadata through preload so `apps/web` can build auth and RPC clients from the true runtime backend URL instead of baked `VITE_SERVER_URL`. `apps/server` remains an env-driven service and does not take on packaged bootstrap responsibilities.

**Tech Stack:** Electron, TypeScript, Vitest, Bun, existing packaged server binary flow, local SQLite/libsql-compatible file URL configuration.

---

### Task 1: Add runtime path resolution module

**Files:**
- Create: `apps/desktop/src/runtime-paths.ts`
- Test: `apps/desktop/src/runtime-paths.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { resolveRuntimePaths } from "./runtime-paths";

describe("resolveRuntimePaths", () => {
  it("derives runtime files under Electron userData", () => {
    const paths = resolveRuntimePaths("/home/alice/.config/Chiron");

    expect(paths.runtimeRoot).toBe("/home/alice/.config/Chiron/runtime");
    expect(paths.configFile).toBe("/home/alice/.config/Chiron/runtime/config.json");
    expect(paths.secretsFile).toBe("/home/alice/.config/Chiron/runtime/secrets.json");
    expect(paths.databaseFile).toBe("/home/alice/.config/Chiron/runtime/data/chiron.db");
    expect(paths.logsDir).toBe("/home/alice/.config/Chiron/runtime/logs");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-paths.test.ts`
Expected: FAIL because `resolveRuntimePaths` does not exist yet.

**Step 3: Write minimal implementation**

```ts
import { join } from "node:path";

export function resolveRuntimePaths(userDataPath: string) {
  const runtimeRoot = join(userDataPath, "runtime");
  return {
    runtimeRoot,
    configFile: join(runtimeRoot, "config.json"),
    secretsFile: join(runtimeRoot, "secrets.json"),
    dataDir: join(runtimeRoot, "data"),
    databaseFile: join(runtimeRoot, "data", "chiron.db"),
    logsDir: join(runtimeRoot, "logs"),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-paths.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-paths.ts apps/desktop/src/runtime-paths.test.ts
git commit -m "feat(desktop): add runtime path resolution"
```

### Task 2: Add runtime config creation and migration helpers

**Files:**
- Create: `apps/desktop/src/runtime-config.ts`
- Test: `apps/desktop/src/runtime-config.test.ts`
- Modify: `apps/desktop/src/runtime-paths.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { createDefaultRuntimeConfig, migrateRuntimeConfig } from "./runtime-config";

describe("runtime config", () => {
  it("creates default local config", () => {
    const config = createDefaultRuntimeConfig({
      port: 43110,
      databaseUrl: "file:/tmp/chiron.db",
    });

    expect(config).toEqual({
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: { kind: "local", url: "file:/tmp/chiron.db" },
    });
  });

  it("keeps version 1 configs unchanged", () => {
    const config = {
      version: 1,
      mode: "local",
      server: { kind: "bundled", port: 43110 },
      database: { kind: "local", url: "file:/tmp/chiron.db" },
    };

    expect(migrateRuntimeConfig(config)).toEqual(config);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-config.test.ts`
Expected: FAIL because config helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement a versioned config type and the two helpers in `apps/desktop/src/runtime-config.ts`.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-config.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-config.ts apps/desktop/src/runtime-config.test.ts apps/desktop/src/runtime-paths.ts
git commit -m "feat(desktop): add runtime config helpers"
```

### Task 3: Add persisted secret management

**Files:**
- Create: `apps/desktop/src/runtime-secrets.ts`
- Test: `apps/desktop/src/runtime-secrets.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { createSecrets, readSecrets } from "./runtime-secrets";

describe("runtime secrets", () => {
  it("creates a better auth secret once", () => {
    const secrets = createSecrets();

    expect(secrets.betterAuthSecret.length).toBeGreaterThan(20);
  });

  it("accepts an existing persisted secret", () => {
    expect(readSecrets({ betterAuthSecret: "fixed" })).toEqual({
      betterAuthSecret: "fixed",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-secrets.test.ts`
Expected: FAIL because secret helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement persisted secret typing plus generation/validation helpers in `apps/desktop/src/runtime-secrets.ts`.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-secrets.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-secrets.ts apps/desktop/src/runtime-secrets.test.ts
git commit -m "feat(desktop): add runtime secret helpers"
```

### Task 4: Add server environment derivation

**Files:**
- Create: `apps/desktop/src/runtime-env.ts`
- Test: `apps/desktop/src/runtime-env.test.ts`
- Modify: `apps/desktop/src/runtime-config.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { buildServerEnv } from "./runtime-env";

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
      rendererOrigin: "http://127.0.0.1:43110",
    });

    expect(env.DATABASE_URL).toBe("file:/tmp/chiron.db");
    expect(env.BETTER_AUTH_SECRET).toBe("secret");
    expect(env.BETTER_AUTH_URL).toBe("http://127.0.0.1:43110");
    expect(env.CORS_ORIGIN).toBe("http://127.0.0.1:43110");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-env.test.ts`
Expected: FAIL because env derivation does not exist yet.

**Step 3: Write minimal implementation**

Implement `buildServerEnv()` in `apps/desktop/src/runtime-env.ts`.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-env.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-env.ts apps/desktop/src/runtime-env.test.ts apps/desktop/src/runtime-config.ts
git commit -m "feat(desktop): derive packaged server env"
```

### Task 5: Add bootstrap orchestration helpers

**Files:**
- Create: `apps/desktop/src/runtime-bootstrap.ts`
- Test: `apps/desktop/src/runtime-bootstrap.test.ts`
- Modify: `apps/desktop/src/runtime-paths.ts`
- Modify: `apps/desktop/src/runtime-config.ts`
- Modify: `apps/desktop/src/runtime-secrets.ts`
- Modify: `apps/desktop/src/runtime-env.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";

import { bootstrapRuntimeState } from "./runtime-bootstrap";

describe("bootstrapRuntimeState", () => {
  it("creates first-run config and secrets when missing", async () => {
    const writeJson = vi.fn();

    const result = await bootstrapRuntimeState({
      userDataPath: "/tmp/chiron",
      choosePort: vi.fn().mockResolvedValue(43110),
      readJson: vi.fn().mockResolvedValue(undefined),
      writeJson,
      ensureDir: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.config.mode).toBe("local");
    expect(result.secrets.betterAuthSecret.length).toBeGreaterThan(20);
    expect(writeJson).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-bootstrap.test.ts`
Expected: FAIL because bootstrap orchestration does not exist yet.

**Step 3: Write minimal implementation**

Implement `bootstrapRuntimeState()` to:
- resolve runtime paths
- ensure required directories exist
- load or create config
- load or create secrets
- return launch-ready runtime state

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-bootstrap.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-bootstrap.ts apps/desktop/src/runtime-bootstrap.test.ts apps/desktop/src/runtime-paths.ts apps/desktop/src/runtime-config.ts apps/desktop/src/runtime-secrets.ts apps/desktop/src/runtime-env.ts
git commit -m "feat(desktop): add runtime bootstrap orchestration"
```

### Task 6: Wire bootstrap and runtime bridge into packaged startup

**Files:**
- Modify: `apps/desktop/main.ts`
- Modify: `apps/desktop/preload.ts`
- Modify: `apps/web/src/types/desktop.d.ts`
- Modify: `apps/web/src/utils/orpc.ts`
- Modify: `apps/web/src/lib/auth-client.ts`
- Modify: `apps/desktop/src/runtime-orchestration.test.ts`
- Modify: `apps/desktop/src/app-lifecycle.test.ts`
- Modify: `apps/desktop/src/packaged-load.test.ts`
- Modify: `apps/desktop/src/packaged-runtime-paths.test.ts`

**Step 1: Write the failing test**

Add regression tests proving packaged startup no longer requires externally supplied `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `CORS_ORIGIN`, and that the packaged renderer reads the real runtime backend URL from desktop instead of baked `VITE_SERVER_URL`.

Example target assertion:

```ts
expect(spawn).toHaveBeenCalledWith(
  "/opt/Chiron/resources/server-dist/server",
  [],
  expect.objectContaining({
    env: expect.objectContaining({
      DATABASE_URL: expect.stringContaining("chiron.db"),
      BETTER_AUTH_SECRET: expect.any(String),
    }),
  }),
);

expect(window.desktop?.runtime?.backendUrl).toBe("http://127.0.0.1:43110");
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-orchestration.test.ts src/app-lifecycle.test.ts src/packaged-load.test.ts src/packaged-runtime-paths.test.ts`
Expected: FAIL because packaged startup still depends on bootstrap-only desktop state and the renderer still uses baked web env.

**Step 3: Write minimal implementation**

Update `apps/desktop/main.ts` so packaged startup:
- resolves `app.getPath("userData")`
- bootstraps runtime state
- derives server env centrally
- launches the packaged server with bootstrap env
- exposes packaged runtime backend metadata through preload

Update the renderer clients so packaged desktop mode:
- reads runtime backend metadata from `window.desktop`
- prefers that runtime backend URL over `VITE_SERVER_URL`
- leaves browser/web mode unchanged when the desktop bridge is absent

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-orchestration.test.ts src/app-lifecycle.test.ts src/packaged-load.test.ts src/packaged-runtime-paths.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/preload.ts apps/web/src/types/desktop.d.ts apps/web/src/utils/orpc.ts apps/web/src/lib/auth-client.ts apps/desktop/src/runtime-orchestration.test.ts apps/desktop/src/app-lifecycle.test.ts apps/desktop/src/packaged-load.test.ts apps/desktop/src/packaged-runtime-paths.test.ts
git commit -m "feat(desktop): bridge packaged runtime backend"
```

### Task 7: Handle corrupt config and missing-port recovery

**Files:**
- Modify: `apps/desktop/src/runtime-bootstrap.ts`
- Modify: `apps/desktop/src/runtime-bootstrap.test.ts`
- Modify: `apps/desktop/src/runtime-config.ts`

**Step 1: Write the failing test**

Add tests for:
- corrupt `config.json` gets backed up and regenerated
- occupied configured port falls back to a new free port

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/runtime-bootstrap.test.ts`
Expected: FAIL because recovery logic is not implemented yet.

**Step 3: Write minimal implementation**

Implement backup-and-regenerate behavior plus port fallback logic.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/runtime-bootstrap.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/src/runtime-bootstrap.ts apps/desktop/src/runtime-bootstrap.test.ts apps/desktop/src/runtime-config.ts
git commit -m "fix(desktop): recover from corrupt runtime config"
```

### Task 8: Verify packaged desktop startup contracts end to end

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src/package-config.test.ts`
- Optionally create: `apps/desktop/src/packaged-bootstrap-smoke.test.ts`

**Step 1: Write the failing test**

Add a smoke-oriented contract test that asserts packaged startup depends on bootstrap-managed runtime paths and desktop-provided runtime backend metadata rather than shell-provided env or baked `VITE_SERVER_URL`.

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/package-config.test.ts`
Expected: FAIL if the package/build config does not yet include any new bootstrap expectations.

**Step 3: Write minimal implementation**

Adjust package/build-time expectations only if required by the smoke contract. Keep this step minimal and avoid inventing new packaging behavior unless tests require it.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/package-config.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/package.json apps/desktop/src/package-config.test.ts apps/desktop/src/packaged-bootstrap-smoke.test.ts
git commit -m "test(desktop): cover packaged bootstrap contracts"
```

### Task 9: Run full verification

**Files:**
- Modify: `docs/plans/2026-03-15-desktop-self-bootstrap-design.md`
- Modify: `docs/plans/2026-03-15-desktop-self-bootstrap.md`

**Step 1: Run desktop tests**

Run: `bun --filter desktop test`
Expected: PASS with all desktop tests green.

**Step 2: Run type checks**

Run: `bun --filter desktop check-types`
Expected: PASS.

**Step 3: Run workspace checks**

Run: `bun run check`
Expected: PASS.

**Step 4: Run workspace tests**

Run: `bun run test`
Expected: PASS.

**Step 5: Run packaged artifact build**

Run: `bun --filter desktop package:linux`
Expected: PASS and produce `apps/desktop/dist-electron/desktop-0.0.0.AppImage`.

**Step 6: Smoke test packaged app with clean runtime state**

Run: `xvfb-run -a apps/desktop/dist-electron/linux-unpacked/desktop`
Expected: packaged app starts without externally supplied `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `CORS_ORIGIN`.

**Step 7: Commit documentation adjustments if needed**

```bash
git add docs/plans/2026-03-15-desktop-self-bootstrap-design.md docs/plans/2026-03-15-desktop-self-bootstrap.md
git commit -m "docs(plans): finalize desktop self-bootstrap plan"
```
