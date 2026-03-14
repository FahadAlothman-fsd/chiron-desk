# CCF.2 Thin Electron Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a thin Electron host in `apps/desktop` that securely loads the existing web renderer and deterministically attaches to or starts the existing server runtime.

**Architecture:** Keep all desktop-host logic local to `apps/desktop`, with testable helpers in `main.ts` and a narrow typed preload bridge in `preload.ts`. Reuse `apps/web` as the only renderer source and treat `apps/server` as an external headless process boundary reached through an explicit `start:headless` script and HTTP readiness probing.

**Tech Stack:** Bun workspaces, Turborepo, TypeScript, Electron, Vitest, Vite, React, Hono

---

### Task 1: Scaffold the desktop package baseline

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vitest.config.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

```ts
// apps/desktop/src/workspace-contract.test.ts
import { describe, expect, it } from 'vitest'
import desktopPackage from '../package.json'

describe('desktop workspace contract', () => {
  it('declares the desktop host package scripts', () => {
    expect(desktopPackage.name).toBe('@chiron/desktop')
    expect(desktopPackage.scripts.dev).toBeTruthy()
    expect(desktopPackage.scripts.test).toBeTruthy()
    expect(desktopPackage.scripts['check-types']).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/desktop test`
Expected: FAIL because `apps/desktop` does not exist yet

**Step 3: Write minimal implementation**

Create the package/config files with package-local scripts and add only minimal root delegation if it is needed for desktop workflows.

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/desktop test apps/desktop/src/workspace-contract.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop package.json
git commit -m "feat(desktop): scaffold electron host workspace"
```

### Task 2: Add secure main-process configuration helpers

**Files:**
- Create: `apps/desktop/src/main-config.test.ts`
- Modify: `apps/desktop/main.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { getBrowserWindowOptions } from '../main'

describe('browser window security defaults', () => {
  it('uses secure runtime defaults', () => {
    const options = getBrowserWindowOptions()

    expect(options.webPreferences?.contextIsolation).toBe(true)
    expect(options.webPreferences?.nodeIntegration).toBe(false)
    expect(options.webPreferences?.sandbox).toBe(true)
    expect(options.webPreferences?.preload).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/desktop test apps/desktop/src/main-config.test.ts`
Expected: FAIL because `getBrowserWindowOptions` does not exist yet

**Step 3: Write minimal implementation**

Export a helper from `apps/desktop/main.ts` that returns secure `BrowserWindowConstructorOptions` with a preload path.

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/desktop test apps/desktop/src/main-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/main-config.test.ts
git commit -m "test(desktop): lock secure browser window defaults"
```

### Task 3: Add renderer target resolution for dev and packaged mode

**Files:**
- Create: `apps/desktop/src/dev-load.test.ts`
- Create: `apps/desktop/src/packaged-load.test.ts`
- Modify: `apps/desktop/main.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { resolveRendererTarget } from '../main'

describe('renderer target resolution', () => {
  it('uses the dev server url when present', () => {
    expect(resolveRendererTarget({ devServerUrl: 'http://localhost:3001' })).toEqual({
      mode: 'url',
      target: 'http://localhost:3001',
    })
  })

  it('uses built web assets in packaged mode', () => {
    expect(resolveRendererTarget({ appPath: '/repo/apps/desktop' })).toEqual({
      mode: 'file',
      target: '/repo/apps/web/dist/index.html',
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter @chiron/desktop test apps/desktop/src/dev-load.test.ts apps/desktop/src/packaged-load.test.ts`
Expected: FAIL because `resolveRendererTarget` does not exist yet

**Step 3: Write minimal implementation**

Implement a deterministic helper that returns either a dev URL target or the packaged `apps/web/dist/index.html` target.

**Step 4: Run tests to verify they pass**

Run: `bun --filter @chiron/desktop test apps/desktop/src/dev-load.test.ts apps/desktop/src/packaged-load.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/dev-load.test.ts apps/desktop/src/packaged-load.test.ts
git commit -m "feat(desktop): resolve dev and packaged renderer targets"
```

### Task 4: Add backend orchestration helpers and server launch contract

**Files:**
- Create: `apps/desktop/src/runtime-orchestration.test.ts`
- Modify: `apps/desktop/main.ts`
- Modify: `apps/server/package.json`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import serverPackage from '../../server/package.json'
import { ensureRuntimeReady } from '../main'

describe('runtime orchestration contract', () => {
  it('requires the server headless start contract', () => {
    expect(serverPackage.scripts['start:headless']).toBeTruthy()
  })

  it('attaches when the backend probe is already healthy', async () => {
    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(true),
      startServer: vi.fn(),
      waitForReady: vi.fn(),
    })

    expect(result.mode).toBe('attached')
  })

  it('starts and waits when the backend is absent', async () => {
    const startServer = vi.fn().mockResolvedValue({ owned: true })
    const waitForReady = vi.fn().mockResolvedValue(undefined)

    const result = await ensureRuntimeReady({
      probe: vi.fn().mockResolvedValue(false),
      startServer,
      waitForReady,
    })

    expect(startServer).toHaveBeenCalledOnce()
    expect(waitForReady).toHaveBeenCalledOnce()
    expect(result.mode).toBe('started')
  })

  it('fails clearly when readiness never succeeds', async () => {
    await expect(
      ensureRuntimeReady({
        probe: vi.fn().mockResolvedValue(false),
        startServer: vi.fn().mockResolvedValue({ owned: true }),
        waitForReady: vi.fn().mockRejectedValue(new Error('timeout')),
      }),
    ).rejects.toThrow(/Failed to start required local service/)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter @chiron/desktop test apps/desktop/src/runtime-orchestration.test.ts`
Expected: FAIL because the helper and contract do not exist yet

**Step 3: Write minimal implementation**

Add `start:headless` to `apps/server/package.json` and implement exported orchestration helpers in `apps/desktop/main.ts` for probe, attach-or-start, readiness wait, and clear failure messaging.

**Step 4: Run tests to verify they pass**

Run: `bun --filter @chiron/desktop test apps/desktop/src/runtime-orchestration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/main.ts apps/desktop/src/runtime-orchestration.test.ts apps/server/package.json
git commit -m "feat(desktop): add runtime attach or start orchestration"
```

### Task 5: Add the narrow preload bridge and renderer typing

**Files:**
- Create: `apps/desktop/src/preload-contract.test.ts`
- Modify: `apps/desktop/preload.ts`
- Create: `apps/web/src/types/desktop.d.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { desktopApiKeys } from '../preload'

describe('preload bridge contract', () => {
  it('exposes only the approved desktop api surface', () => {
    expect(desktopApiKeys).toEqual(['getRuntimeStatus', 'restartLocalServices'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/desktop test apps/desktop/src/preload-contract.test.ts`
Expected: FAIL because the bridge contract does not exist yet

**Step 3: Write minimal implementation**

Implement the narrow preload bridge and add matching renderer-side ambient types.

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/desktop test apps/desktop/src/preload-contract.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/preload.ts apps/desktop/src/preload-contract.test.ts apps/web/src/types/desktop.d.ts
git commit -m "feat(desktop): add narrow preload bridge"
```

### Task 6: Wire application bootstrap and workspace verification

**Files:**
- Modify: `apps/desktop/main.ts`
- Modify: `apps/desktop/package.json`
- Modify: `package.json`
- Modify: `_bmad-output/implementation-artifacts/ccf-2-add-thin-electron-shell-with-secure-runtime-boundaries.md`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import desktopPackage from '../package.json'

describe('desktop startup surface', () => {
  it('keeps package-driven commands for desktop workflows', () => {
    expect(desktopPackage.scripts.dev).toBeTruthy()
    expect(desktopPackage.scripts.start).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/desktop test apps/desktop/src/workspace-contract.test.ts`
Expected: FAIL until the full startup surface is wired

**Step 3: Write minimal implementation**

Wire the Electron bootstrap path around the tested helpers, keep root delegation minimal, and update only the permitted sections of the story file as tasks are actually completed.

**Step 4: Run tests to verify it passes**

Run: `bun --filter @chiron/desktop test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop package.json _bmad-output/implementation-artifacts/ccf-2-add-thin-electron-shell-with-secure-runtime-boundaries.md
git commit -m "feat(desktop): wire electron host bootstrap"
```

### Task 7: Validate the full story surface

**Files:**
- Modify: `_bmad-output/implementation-artifacts/ccf-2-add-thin-electron-shell-with-secure-runtime-boundaries.md`

**Step 1: Run the desktop package tests**

Run: `bun --filter @chiron/desktop test`
Expected: PASS

**Step 2: Run the workspace regression suite**

Run: `bun run test && bun run check && bun run check-types`
Expected: PASS

**Step 3: Verify story acceptance criteria and file list**

Confirm every task/subtask is complete, file list is exhaustive, and completion notes describe the actual implementation and evidence.

**Step 4: Update story status**

Set the story status to `review` only after all validations pass.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/ccf-2-add-thin-electron-shell-with-secure-runtime-boundaries.md
git commit -m "docs(story): finalize CCF.2 for review"
```
