# CC-Foundation Electron Cutover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Tauri with a thin Electron shell while keeping `apps/web` as the single renderer and preserving web plus desktop runtime parity.

**Architecture:** Keep product logic in `apps/web` and `apps/server`, and add `apps/desktop` only for host responsibilities (window lifecycle, preload bridge, backend process bootstrap). Remove all Tauri artifacts first because the team is currently web-first, then establish deterministic dev/prod desktop startup and smoke gates. Gate Epic 3 on parity checks, not on package refactors.

**Tech Stack:** Bun workspaces, Turborepo, Electron, Vite (web renderer), TanStack Router/Query, Vitest, Playwright MCP.

---

## Core Package Guardrails (Must Hold During Execution)

- `core` stays thin and orchestration-only.
- Allowed in `core`: transition/use-case orchestration, ports/interfaces, policy composition.
- Forbidden in `core`: DB/filesystem/process adapters, Electron host code, Hono handlers, UI code.
- `packages/contracts` remains canonical for shared API/domain contracts.
- Domain logic stays in domain packages; `core` coordinates domain packages rather than absorbing them.
- Dependency direction remains `domain + contracts -> core -> apps`.

These guardrails are part of acceptance criteria for all tasks below. Any change that violates them is out of scope for CC-Foundation.

---

### Task 1: Remove Tauri Wiring

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package.json`
- Modify: `turbo.json`
- Delete: `apps/web/src-tauri/**`

**Step 1: Write failing contract test for script surface**

Create `apps/web/scripts.contract.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import webPkg from "../package.json"

describe("web package scripts", () => {
  it("does not expose tauri scripts", () => {
    expect(webPkg.scripts.tauri).toBeUndefined()
    expect(webPkg.scripts["desktop:dev"]).toBeUndefined()
    expect(webPkg.scripts["desktop:build"]).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run scripts.contract.test.ts`
Expected: FAIL because Tauri scripts still exist.

**Step 3: Remove Tauri scripts/deps and root turbo Tauri tasks**

Update `apps/web/package.json` to remove:
- `tauri`
- `desktop:dev`
- `desktop:dev:attach`
- `desktop:build`
- `@tauri-apps/cli`

Update `package.json` to remove:
- `dev:native`
- `dev:native:attach`

Update `turbo.json` to remove:
- `dev:native`
- `dev:native:attach`

Delete `apps/web/src-tauri/**`.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run scripts.contract.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/package.json package.json turbo.json apps/web/scripts.contract.test.ts apps/web/src-tauri
git commit -m "chore(desktop): remove tauri runtime surface"
```

---

### Task 2: Scaffold Thin Electron App Package

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/main.ts`
- Create: `apps/desktop/preload.ts`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/src/main-config.test.ts`

**Step 1: Write failing security config test**

Create `apps/desktop/src/main-config.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { windowPreferences } from "../main"

describe("desktop window security", () => {
  it("uses secure defaults", () => {
    expect(windowPreferences.contextIsolation).toBe(true)
    expect(windowPreferences.nodeIntegration).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/desktop vitest run src/main-config.test.ts`
Expected: FAIL because files do not exist.

**Step 3: Add minimal Electron package implementation**

Create `apps/desktop/package.json`:

```json
{
  "name": "desktop",
  "private": true,
  "type": "module",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check-types": "tsc -p tsconfig.json --noEmit",
    "dev": "electron .",
    "test": "vitest run"
  },
  "devDependencies": {
    "electron": "^37.3.1",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

Create `apps/desktop/main.ts`:

```ts
import { BrowserWindow, app } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const windowPreferences = {
  preload: path.join(__dirname, "preload.js"),
  contextIsolation: true,
  nodeIntegration: false,
} as const

export const createMainWindow = () => {
  const win = new BrowserWindow({ width: 1280, height: 840, webPreferences: windowPreferences })
  return win
}

app.whenReady().then(() => {
  createMainWindow()
})
```

Create `apps/desktop/preload.ts`:

```ts
import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("desktop", {
  ping: () => "pong",
})
```

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/desktop vitest run src/main-config.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat(desktop): add thin electron shell baseline"
```

---

### Task 3: Dev Parity (Desktop Loads Web Dev URL)

**Files:**
- Modify: `apps/desktop/main.ts`
- Modify: `apps/desktop/package.json`
- Modify: `package.json`
- Modify: `turbo.json`
- Test: `apps/desktop/src/dev-load.test.ts`

**Step 1: Write failing dev URL selection test**

Create `apps/desktop/src/dev-load.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolveRendererUrl } from "../main"

describe("renderer url resolution", () => {
  it("uses VITE_DEV_SERVER_URL when present", () => {
    expect(resolveRendererUrl("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/desktop vitest run src/dev-load.test.ts`
Expected: FAIL because helper is missing.

**Step 3: Implement URL resolver and wire scripts**

Update `apps/desktop/main.ts`:

```ts
export const resolveRendererUrl = (devUrl?: string) => {
  if (devUrl) return devUrl
  return new URL("../web/dist/index.html", import.meta.url).toString()
}
```

In app startup:

```ts
const devUrl = process.env.VITE_DEV_SERVER_URL
if (devUrl) {
  void win.loadURL(resolveRendererUrl(devUrl))
} else {
  void win.loadFile(path.join(__dirname, "../web/dist/index.html"))
}
```

Update scripts:
- `apps/desktop/package.json` add `"dev:attach": "electron ."`
- `package.json` add `"dev:desktop": "turbo run dev --filter=desktop"`
- `turbo.json` ensure `dev` is package-driven only (no root task logic).

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/desktop vitest run src/dev-load.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/package.json apps/desktop/src/dev-load.test.ts package.json turbo.json
git commit -m "feat(desktop): wire dev renderer url parity"
```

---

### Task 4: Production Packaging Bootstrap

**Files:**
- Modify: `apps/desktop/main.ts`
- Create: `apps/desktop/src/packaged-load.test.ts`
- Modify: `apps/desktop/package.json`
- Modify: `apps/web/package.json`

**Step 1: Write failing packaged path test**

Create `apps/desktop/src/packaged-load.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolveRendererIndexPath } from "../main"

describe("packaged renderer path", () => {
  it("points to apps/web/dist/index.html", () => {
    expect(resolveRendererIndexPath().endsWith("apps/web/dist/index.html")).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/desktop vitest run src/packaged-load.test.ts`
Expected: FAIL because helper is missing.

**Step 3: Implement deterministic packaged loading**

Update `apps/desktop/main.ts`:

```ts
export const resolveRendererIndexPath = () => {
  return path.resolve(process.cwd(), "apps/web/dist/index.html")
}

if (process.env.VITE_DEV_SERVER_URL) {
  void win.loadURL(process.env.VITE_DEV_SERVER_URL)
} else {
  void win.loadFile(resolveRendererIndexPath())
}
```

Update scripts:
- `apps/web/package.json` ensure `build` outputs `dist` (already true, keep stable)
- `apps/desktop/package.json` add `"build:app": "bun run --cwd ../web build && bun run build"`

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/desktop vitest run src/packaged-load.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/packaged-load.test.ts apps/desktop/package.json apps/web/package.json
git commit -m "feat(desktop): add packaged renderer bootstrap path"
```

---

### Task 5: Add Minimal Preload Bridge Contract

**Files:**
- Modify: `apps/desktop/preload.ts`
- Create: `apps/web/src/types/desktop.d.ts`
- Create: `apps/web/src/features/desktop/desktop-bridge.test.ts`

**Step 1: Write failing renderer bridge type test**

Create `apps/web/src/features/desktop/desktop-bridge.test.ts`:

```ts
import { describe, expect, it } from "vitest"

describe("desktop preload bridge", () => {
  it("exposes ping API when running in desktop shell", () => {
    const api = (globalThis as any).desktop
    expect(typeof api?.ping).toBe("function")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web vitest run src/features/desktop/desktop-bridge.test.ts`
Expected: FAIL because bridge type/wiring is missing.

**Step 3: Implement narrow bridge and types**

Update `apps/desktop/preload.ts`:

```ts
import { contextBridge } from "electron"

export type DesktopBridge = {
  ping: () => string
}

const desktopBridge: DesktopBridge = {
  ping: () => "pong",
}

contextBridge.exposeInMainWorld("desktop", desktopBridge)
```

Create `apps/web/src/types/desktop.d.ts`:

```ts
export {}

declare global {
  interface Window {
    desktop?: {
      ping: () => string
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web vitest run src/features/desktop/desktop-bridge.test.ts`
Expected: PASS (with test setup mocking `window.desktop` if needed).

**Step 5: Commit**

```bash
git add apps/desktop/preload.ts apps/web/src/types/desktop.d.ts apps/web/src/features/desktop/desktop-bridge.test.ts
git commit -m "feat(desktop): add typed minimal preload bridge"
```

---

### Task 6: Validation Gates (`/bmad-tea-testarch-framework` + MCP Smoke)

**Files:**
- Create: `docs/plans/2026-03-13-cc-foundation-validation-checklist.md`
- Create: `apps/desktop/scripts/mcp-smoke.md`
- Modify: `package.json`

**Step 1: Write failing gate script entry test**

Create `apps/desktop/scripts.validation.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import rootPkg from "../../../package.json"

describe("validation gate scripts", () => {
  it("has desktop smoke command", () => {
    expect(rootPkg.scripts["test:desktop:smoke"]).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/desktop vitest run scripts.validation.test.ts`
Expected: FAIL because script is missing.

**Step 3: Add gate commands and checklist**

Update `package.json` scripts:

```json
{
  "scripts": {
    "test:desktop:smoke": "bun run --cwd apps/desktop test",
    "test:framework:smoke": "bun run /bmad-tea-testarch-framework"
  }
}
```

Create `docs/plans/2026-03-13-cc-foundation-validation-checklist.md` with command sequence:

```md
1. bun run dev:web
2. bun run dev:desktop
3. bun run build --filter=web
4. bun run test:desktop:smoke
5. bun run test:framework:smoke
6. Run Playwright MCP click/assert smoke against desktop runtime.
```

Create `apps/desktop/scripts/mcp-smoke.md` documenting exact MCP flow and expected pass signal (`feature-verified`).

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/desktop vitest run scripts.validation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json docs/plans/2026-03-13-cc-foundation-validation-checklist.md apps/desktop/scripts/mcp-smoke.md apps/desktop/scripts.validation.test.ts
git commit -m "test(desktop): add cc-foundation validation gates"
```

---

### Task 7: Epic Gating And Planning Artifacts

**Files:**
- Modify: `_bmad-output/planning-artifacts/prd.md`
- Modify: `_bmad-output/planning-artifacts/epics.md`
- Create: `_bmad-output/planning-artifacts/epics/cc-foundation-electron-cutover.md`

**Step 1: Write failing planning consistency check**

Create `_bmad-output/planning-artifacts/cc-foundation.contract.md`:

```md
Contract:
- PRD no longer states Tauri as target desktop shell.
- Epic 3 depends on CC-Foundation completion gates.
- CC-Foundation epic defines explicit exit criteria.
- Core guardrails are explicitly documented (thin orchestration only).
```

**Step 2: Run manual check to verify it fails**

Run: `grep -n "Tauri" _bmad-output/planning-artifacts/prd.md`
Expected: Existing Tauri references found.

**Step 3: Update planning docs**

- Replace Tauri-first language with Electron shell language in `prd.md`.
- Add prerequisite dependency line in `epics.md`:
  - `Epic 3 starts after CC-Foundation exit criteria are met.`
- Add new epic file with story list `CCF-1..CCF-5` and exit gates.
- Add explicit core-boundary language:
  - allowed: orchestration/ports/policies
  - forbidden: infra adapters, Electron host code, transport handlers, UI code

**Step 4: Run manual check to verify it passes**

Run:
- `grep -n "Tauri" _bmad-output/planning-artifacts/prd.md`
- `grep -n "CC-Foundation" _bmad-output/planning-artifacts/epics.md`
- `grep -n "core" _bmad-output/planning-artifacts/epics.md`

Expected: no stale target-language; CC dependency visible; core-boundary text visible.

**Step 5: Commit**

```bash
git add _bmad-output/planning-artifacts/prd.md _bmad-output/planning-artifacts/epics.md _bmad-output/planning-artifacts/epics/cc-foundation-electron-cutover.md _bmad-output/planning-artifacts/cc-foundation.contract.md
git commit -m "docs(planning): add cc-foundation prerequisite for electron cutover"
```

---

## Final Verification Sequence

Run these in order:

1. `bun run check-types`
2. `bun run test`
3. `bun run dev:web` (smoke)
4. `bun run dev:desktop` (smoke)
5. `bun run build`
6. `bun run test:desktop:smoke`
7. `bun run test:framework:smoke`

Expected outcome: web and desktop runtime parity established, Tauri fully removed, Epic 3 unblocked behind clear pass/fail gates.

## Skill References

- `@superpowers/executing-plans` for execution workflow.
- `@turborepo` for package-task and root delegation compliance.
- `@playwright` for MCP desktop interaction smoke validation.
