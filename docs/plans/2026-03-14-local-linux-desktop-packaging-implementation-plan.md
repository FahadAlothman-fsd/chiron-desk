# Local Linux Desktop Packaging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce a local Linux desktop artifact that bundles the built web renderer, built headless server, and built Electron shell so Chiron can launch to the login screen without dev servers.

**Architecture:** Keep packaging isolated inside `apps/desktop` and treat it as the distribution boundary. Use `electron-builder` to package the already-built outputs from `apps/web`, `apps/server`, and `apps/desktop`, while tightening packaged-path resolution in `apps/desktop/main.ts` so the packaged app starts the built server and loads the built renderer from the artifact layout.

**Tech Stack:** Electron, electron-builder, TypeScript, Bun workspaces, tsdown, Vitest

---

### Task 1: Add packaging contract tests

**Files:**
- Modify: `apps/desktop/src/package-entrypoint.test.ts`
- Create: `apps/desktop/src/package-config.test.ts`
- Test: `apps/desktop/src/package-entrypoint.test.ts`
- Test: `apps/desktop/src/package-config.test.ts`

**Step 1: Write the failing packaging tests**

Add tests that assert all of the following:

```ts
import { describe, expect, it } from "vitest";
import desktopPackage from "../package.json";

describe("desktop packaging contract", () => {
  it("exposes a local Linux packaging script", () => {
    expect(desktopPackage.scripts["package:linux"]).toContain("electron-builder");
  });

  it("declares electron-builder for local packaging", () => {
    expect(desktopPackage.devDependencies["electron-builder"]).toBeTruthy();
  });
});
```

and:

```ts
import { describe, expect, it } from "vitest";
import desktopPackage from "../package.json";

describe("desktop builder config", () => {
  const builder = desktopPackage.build;

  it("targets local Linux artifacts", () => {
    expect(builder.linux.target).toContain("AppImage");
    expect(builder.linux.target).toContain("dir");
  });

  it("includes built web and server outputs in extraResources", () => {
    expect(builder.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "../web/dist" }),
        expect.objectContaining({ from: "../server/dist" }),
      ]),
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter desktop test src/package-entrypoint.test.ts src/package-config.test.ts`

Expected: FAIL because `package:linux`, `electron-builder`, and `build` config do not exist yet.

**Step 3: Write minimal package-level implementation**

Update `apps/desktop/package.json` with the minimal new script/dependency/config surface needed for the tests:

```json
{
  "scripts": {
    "package:linux": "bun run build:release && electron-builder --linux AppImage dir"
  },
  "devDependencies": {
    "electron-builder": "<version>"
  },
  "build": {
    "appId": "local.chiron.desktop",
    "linux": {
      "target": ["AppImage", "dir"]
    },
    "extraResources": [
      { "from": "../web/dist", "to": "web-dist" },
      { "from": "../server/dist", "to": "server-dist" }
    ]
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun --filter desktop test src/package-entrypoint.test.ts src/package-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/package.json apps/desktop/src/package-entrypoint.test.ts apps/desktop/src/package-config.test.ts bun.lock
git commit -m "feat: add local linux desktop packaging config"
```

### Task 2: Add a release build script for desktop packaging

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/server/package.json`
- Modify: `turbo.json`
- Test: `apps/desktop/src/package-config.test.ts`

**Step 1: Write the failing test**

Extend the package-config test with assertions like:

```ts
it("builds release prerequisites before packaging", () => {
  expect(desktopPackage.scripts["build:release"]).toContain("bun --filter web build");
  expect(desktopPackage.scripts["build:release"]).toContain("bun --filter server build");
  expect(desktopPackage.scripts["build:release"]).toContain("bun run build");
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/package-config.test.ts`

Expected: FAIL because `build:release` does not exist yet.

**Step 3: Write minimal implementation**

Add a desktop-local release build script that orchestrates the three build outputs:

```json
{
  "scripts": {
    "build:release": "bun --filter web build && bun --filter server build && bun run build"
  }
}
```

If needed for Turborepo clarity, add a package task entry in `turbo.json` for packaging/release execution, but keep the actual logic inside package scripts.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/package-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/package.json apps/web/package.json apps/server/package.json turbo.json apps/desktop/src/package-config.test.ts
git commit -m "feat: add desktop release build workflow"
```

### Task 3: Add packaged path-resolution tests for bundled assets

**Files:**
- Create: `apps/desktop/src/packaged-runtime-paths.test.ts`
- Modify: `apps/desktop/main.ts`
- Test: `apps/desktop/src/packaged-runtime-paths.test.ts`

**Step 1: Write the failing test**

Create tests for helper functions that resolve packaged asset locations. Example shape:

```ts
import { describe, expect, it } from "vitest";
import { resolvePackagedPaths } from "../main";

describe("packaged runtime paths", () => {
  it("resolves the packaged renderer entry from process resources", () => {
    expect(
      resolvePackagedPaths({
        appRoot: "/opt/Chiron/resources/app.asar/dist/desktop",
        resourcesPath: "/opt/Chiron/resources",
      }).rendererHtml,
    ).toBe("/opt/Chiron/resources/web-dist/index.html");
  });

  it("resolves the packaged server working directory and entry", () => {
    expect(
      resolvePackagedPaths({
        appRoot: "/opt/Chiron/resources/app.asar/dist/desktop",
        resourcesPath: "/opt/Chiron/resources",
      }),
    ).toMatchObject({
      serverCwd: "/opt/Chiron/resources/server-dist",
      serverEntry: "index.mjs",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/packaged-runtime-paths.test.ts`

Expected: FAIL because `resolvePackagedPaths` does not exist yet.

**Step 3: Write minimal implementation**

Add a helper to `apps/desktop/main.ts` that derives packaged locations from `process.resourcesPath` (or an injected equivalent in tests) and use it to support:
- renderer HTML path inside packaged resources
- server working directory inside packaged resources
- server entrypoint for built headless startup

Keep the helper explicit and local to `apps/desktop/main.ts`.

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/packaged-runtime-paths.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/packaged-runtime-paths.test.ts
git commit -m "feat: resolve packaged desktop asset paths"
```

### Task 4: Make packaged startup use bundled web/server resources

**Files:**
- Modify: `apps/desktop/main.ts`
- Modify: `apps/desktop/src/runtime-orchestration.test.ts`
- Modify: `apps/desktop/src/app-lifecycle.test.ts`
- Test: `apps/desktop/src/runtime-orchestration.test.ts`
- Test: `apps/desktop/src/app-lifecycle.test.ts`

**Step 1: Write the failing tests**

Add assertions covering packaged mode behavior:

```ts
it("uses start:headless and packaged resources when no dev renderer is configured", () => {
  expect(resolveServerScript({})).toBe("start:headless");
});

it("starts the packaged server from the packaged server directory", async () => {
  // assert spawn cwd/entry derived from packaged paths
});

it("loads packaged index.html before showing the window", async () => {
  // assert loadFile was called with packaged renderer html path
});
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter desktop test src/runtime-orchestration.test.ts src/app-lifecycle.test.ts`

Expected: FAIL because the packaged runtime still assumes source-tree-relative layout.

**Step 3: Write minimal implementation**

Update `apps/desktop/main.ts` so packaged startup:
- uses packaged path helpers instead of source-tree assumptions
- starts the built server from bundled resources
- loads bundled `index.html`
- preserves the dev-path behavior already verified earlier

Keep the split explicit:
- dev renderer URL present -> source/dev mode
- no dev renderer URL -> packaged/built mode

**Step 4: Run tests to verify they pass**

Run: `bun --filter desktop test src/runtime-orchestration.test.ts src/app-lifecycle.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/runtime-orchestration.test.ts apps/desktop/src/app-lifecycle.test.ts
git commit -m "feat: boot packaged desktop resources"
```

### Task 5: Build a local Linux artifact and verify it exists

**Files:**
- Modify: `apps/desktop/src/package-config.test.ts`
- Modify: `apps/desktop/package.json`
- Test: `apps/desktop/src/package-config.test.ts`

**Step 1: Write the failing test**

Add a packaging-output contract test that asserts the package script emits local Linux artifacts into a predictable directory, for example:

```ts
it("writes packaged artifacts to dist-electron", () => {
  expect(desktopPackage.build.directories.output).toBe("dist-electron");
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter desktop test src/package-config.test.ts`

Expected: FAIL because `directories.output` is not configured yet.

**Step 3: Write minimal implementation**

Add the builder output directory to `apps/desktop/package.json`, for example:

```json
{
  "build": {
    "directories": {
      "output": "dist-electron"
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter desktop test src/package-config.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/package.json apps/desktop/src/package-config.test.ts
git commit -m "feat: configure local desktop artifact output"
```

### Task 6: Verify the full local packaging flow

**Files:**
- Modify: `apps/desktop/package.json` (only if verification reveals a minimal packaging issue)
- Test: `apps/desktop/src/package-entrypoint.test.ts`
- Test: `apps/desktop/src/package-config.test.ts`
- Test: `apps/desktop/src/packaged-runtime-paths.test.ts`
- Test: `apps/desktop/src/runtime-orchestration.test.ts`
- Test: `apps/desktop/src/app-lifecycle.test.ts`

**Step 1: Run focused desktop checks**

Run: `bun --filter desktop test && bun --filter desktop check-types`

Expected: PASS.

**Step 2: Run the local Linux packaging command**

Run: `bun --filter desktop package:linux`

Expected: PASS and artifact(s) written under `apps/desktop/dist-electron/`, including an AppImage and unpacked directory.

**Step 3: Verify the packaged output exists**

Run: `ls "apps/desktop/dist-electron"`

Expected: output includes the Linux artifact names (for example `*.AppImage` and `linux-unpacked/`).

**Step 4: Smoke-test the unpacked app or AppImage**

Run one of:

```bash
"apps/desktop/dist-electron/linux-unpacked/chiron"
```

or, if the executable name differs, run the actual unpacked binary produced by electron-builder.

Expected: packaged app opens, starts the bundled server, loads the bundled renderer, and reaches the login screen without requiring `bun --filter web dev` or `bun --filter server dev`.

**Step 5: Run final workspace verification**

Run: `bun run check-types && bun run test && bun run check`

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/desktop apps/server/tsdown.config.ts turbo.json bun.lock
git commit -m "feat: add local linux desktop packaging"
```
