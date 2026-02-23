# Reset-Baseline Completion & Sprint Handoff

## TL;DR

> **Objective**: Close every open item on the canonical reset-baseline checklist, verify all 7 sprint-readiness gates, and produce a clean GO for `/bmad-bmm-sprint-planning`.
>
> **5 Phases**: A (Harden) → B (Deps + Skeletons) → C (Fonts) → D (Smoke) → E (Gates + Handoff)
>
> **Estimated Effort**: Medium (one focused day)
> **Parallel Execution**: YES — phases are sequential, items within phases are parallel where noted
> **Stop Gates**: Each phase has a binary PASS/FAIL gate. Failure blocks the next phase.

---

## Context

### Baseline Commit
`260f969b8` — `chore: bootstrap better-t-stack baseline`

### Canonical Source
`_bmad-output/planning-artifacts/reset-baseline-checklist.md` (8 sections, 7 sprint-readiness gates)

### Existing Working Code (PRESERVE — do NOT reset)
| Package | State | Contains |
|---|---|---|
| `apps/server` | Working | Hono + oRPC handlers + Better-Auth + CORS |
| `apps/web` | Working | React 19 + TanStack Router + shadcn + theme toggle |
| `packages/api` | Working | oRPC public/protected procedures, healthCheck + privateData routes |
| `packages/auth` | Working | Better-Auth with Drizzle adapter, email/password |
| `packages/db` | Working | Drizzle + SQLite, auth schema (4 tables) |
| `packages/env` | Working | T3 env validation (server + web exports) |
| `packages/config` | Working | Shared tsconfig.base.json |

### Locked Decisions (Immutable)
- **RPC**: oRPC (NOT tRPC) — `@orpc/server` ^1.12.2
- **Realtime**: SSE-first, WebSocket deferred
- **Backend**: Effect-first (Tag/Layer, typed errors)
- **Database**: SQLite + Drizzle (no PostgreSQL)
- **Graph**: React Flow (`@xyflow/react`)
- **Typography**: Commit Mono (primary) + Geist Pixel (accent, 5 variants)
- **Preserved dirs**: `.opencode/`, `.sisyphus/`, `_bmad/`, `_bmad-output/`, `docs/`, `academic_reports/`
- **Business schema**: Implemented in stories, NOT in this baseline

---

## Auto-Resolved Decisions

| Decision | Resolution | Rationale |
|---|---|---|
| methodology-engine inclusion | **YES — include** | Module lock matrix (v1-week6) lists it as Near-Lock with deps. More recent than checklist. Total: 12 new packages. |
| Existing package treatment | **PRESERVE all 7** | api/auth/db/env/config have working code. Skeletons are for NEW packages only. |
| Test runner | **vitest** | oxlint already has vitest settings. Standard for Vite/Bun projects. |
| Effect version | **Effect 3.x (latest)** | Current ecosystem standard. Pin in catalog. |
| Web tsconfig divergence | **Extend base in Phase A** | Consistency required for typecheck gate. |
| framer-motion | **NOT in baseline** | Frontend lock claims "already present" — false. Add in stories when needed. |
| Font sourcing | **@fontsource packages** | `@fontsource/commit-mono`, Geist Pixel self-hosted (no fontsource package). |
| Effect + SQLite pattern | **Manual `Effect.tryPromise` wrapping** | No official bridge. Document pattern decision only, implement in stories. |
| Dual schema (Zod ↔ Effect Schema) | **Zod at oRPC boundary, Effect Schema in contracts** | Conversion at API layer boundary. Document only. |
| `@orpc/effect` community lib | **DO NOT USE** | Unofficial, fragile. Manual Effect wrapping in stories. |
| `packages/env` expansion | **All backend packages use `@chiron/env/server`** | Expand export paths per-story when env vars are added. |

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is command-line executable.

- **Test runner**: vitest via `bun run test` (configured in Phase A)
- **Typecheck**: `bun check-types` (existing turbo task)
- **Lint/Format**: `bun check` (oxlint + oxfmt)
- **Install**: `bun install` (Bun workspace resolution)
- **Doc alignment**: `grep -r` for banned terms across active docs
- **Smoke tests**: `curl` commands against running dev server

---

<!-- PHASE_A_START -->

## Phase A — Baseline Hardening

**Goal**: Fix doc inconsistencies, configure test infrastructure, ensure existing gates pass.
**Stop Gate**: `bun install && bun check-types && bun check` all exit 0.

### A1 — Fix tRPC → oRPC references in planning artifacts
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | 4 markdown files corrected: all `tRPC`/`trpc` → `oRPC`/`orpc` |
| **Files** | `_bmad-output/planning-artifacts/chiron-backend-stack-lock-v1-week6.md` (lines 11, 51-53, 67-68, 236), `_bmad-output/planning-artifacts/chiron-module-lock-matrix-v1-week6.md` (line 33), `_bmad-output/planning-artifacts/architecture.md` (search: 'tRPC remains'), `_bmad-output/project-context.md` (line 30) |
| **Verification** | `grep -ri "trpc" _bmad-output/planning-artifacts/*.md _bmad-output/project-context.md` |
| **Pass** | Returns empty (zero matches) |
| **Fail** | Any line returned |
| **Prerequisites** | None — can start immediately |
| **Parallel** | YES — with A2, A3 |

### A2 — Fix PostgreSQL references + stale commands in project-context.md
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `_bmad-output/project-context.md` corrected: PostgreSQL refs → SQLite, remove port 5434, fix non-existent commands (lines 69, 98-103) |
| **Files** | `_bmad-output/project-context.md` |
| **Verification** | `grep -i "postgresql\|postgres\|5434" _bmad-output/project-context.md` |
| **Pass** | Returns empty |
| **Fail** | Any match found |
| **Prerequisites** | None |
| **Parallel** | YES — with A1, A3 |

### A3 — Fix tRPC references in docs/ architecture files
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | All active (non-archive) docs corrected. Search scope: `docs/architecture/*.md`, `docs/AGENTS.md` |
| **Files** | `docs/architecture/chiron-module-structure.md` and any others found by grep |
| **Verification** | `grep -ri "trpc" docs/architecture/*.md docs/AGENTS.md 2>/dev/null` |
| **Pass** | Returns empty |
| **Fail** | Any match found |
| **Prerequisites** | None |
| **Parallel** | YES — with A1, A2 |

### A4 — Configure vitest + turbo test pipeline
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent |
| **Deliverable** | vitest installed, configured, `turbo test` task works, baseline smoke test file exists |
| **Files to create** | Root `vitest.workspace.ts`, `turbo.json` (add `test` task), root `package.json` (add vitest devDep to catalog) |
| **Files to create (test)** | `packages/api/src/__tests__/smoke.test.ts` — single test: `expect(true).toBe(true)` |
| **Verification** | `bun run test 2>&1; echo "EXIT:$?"` |
| **Pass** | Exit 0, shows 1 test passed |
| **Fail** | Non-zero exit or vitest not found |
| **Prerequisites** | None |
| **Parallel** | YES — with A1-A3, A5 |
| **Notes** | Add `vitest` + `@vitest/coverage-v8` to root devDeps. turbo.json test task: `{ "dependsOn": ["^build"], "inputs": ["src/**", "tests/**"] }`. Workspace config points to `packages/*/vitest.config.ts` and `apps/*/vitest.config.ts`. |

### A5 — Align web tsconfig with base config
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `apps/web/tsconfig.json` extends `@chiron/config/tsconfig.base.json`, adds Vite-specific overrides only |
| **Files** | `apps/web/tsconfig.json` |
| **Verification** | `bun check-types 2>&1; echo "EXIT:$?"` |
| **Pass** | Exit 0 — web app still compiles with stricter config |
| **Fail** | Type errors from new strictness (fix if minor, escalate if structural) |
| **Prerequisites** | None |
| **Parallel** | YES — with A1-A4 |
| **Notes** | Keep: jsx react-jsx, types vite/client, paths @/*. Add via extends: strict, noUncheckedIndexedAccess, noUnusedLocals, noUnusedParams. May surface latent type errors — fix them in this task. |

### A-GATE — Phase A Stop Gate
| Field | Value |
|---|---|
| **Owner** | Orchestrator (automatic) |
| **Verification** | `bun install && bun check-types && bun check && bun run test` |
| **Pass** | All 4 commands exit 0 |
| **Fail** | Any non-zero exit → fix before proceeding to Phase B |
| **Action on Pass** | Commit: `chore(baseline): fix doc refs, configure vitest, harden tsconfig` |

---

<!-- PHASE_B_START -->

## Phase B — Dependency + Package Skeleton Setup

**Goal**: Add locked dependencies to catalogs, create 12 empty-but-compiling package skeletons.
**Stop Gate**: `bun install && bun check-types` exit 0 with all 17 packages present.
**Prerequisite**: Phase A stop gate PASSED.


### B1 — Add Effect ecosystem + React Flow to workspace catalogs
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | Root `package.json` catalog updated with: `effect`, `@effect/schema`, `@effect/platform`, `@xyflow/react`, `@tanstack/react-hotkeys` |
| **Files** | `package.json` (root — catalog section only) |
| **Verification** | `grep -c 'effect\|xyflow\|hotkeys' package.json` |
| **Pass** | Count ≥ 4 |
| **Fail** | Missing any of the 5 new catalog entries |
| **Prerequisites** | Phase A gate passed |
| **Parallel** | YES — with B2 |
| **Notes** | Pin: `effect ^3.15`, `@effect/schema ^0.75`, `@effect/platform ^0.72`, `@xyflow/react ^12`. Do NOT add these as deps yet — only to catalog for workspace resolution. |

### B2 — Add React Flow + hotkeys to web package.json
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `apps/web/package.json` gains `@xyflow/react` and `@tanstack/react-hotkeys` as deps (catalog: version) |
| **Files** | `apps/web/package.json` |
| **Verification** | `bun install 2>&1; echo "EXIT:$?"` |
| **Pass** | Exit 0, no resolution errors |
| **Fail** | Dependency resolution failure |
| **Prerequisites** | B1 (catalog entries exist) |
| **Parallel** | After B1, parallel with B3 |

### B3 — Create 12 new package skeletons
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent |
| **Deliverable** | 12 new dirs under `packages/`: contracts, workflow-engine, agent-runtime, tooling-engine, event-bus, variable-service, template-engine, provider-registry, sandbox-engine, ax-engine, methodology-engine, scripts. Each with: `package.json`, `tsconfig.json`, `src/index.ts` |
| **Files** | 36 new files (3 per package × 12 packages) |
| **Skeleton template** | `package.json`: name `@chiron/{name}`, private, `exports: { ".": { "default": "./src/index.ts" }, "./*": { "default": "./src/*.ts" } }`. `tsconfig.json`: extends `@chiron/config/tsconfig.base.json`. `src/index.ts`: `export {}` |
| **Dependency wiring** | Per module lock matrix: `contracts` depends on `effect` (catalog). `workflow-engine` depends on `@chiron/contracts`. `event-bus` depends on `@chiron/contracts` + `effect`. All others depend on `@chiron/contracts` at minimum. Do NOT add runtime deps (handlebars, ai, simple-git) — those come in stories. Every package gets `@chiron/config` as devDep. |
| **Verification** | `ls -d packages/*/src/index.ts \| wc -l` |
| **Pass** | Count = 17; `bun install && bun check-types` both exit 0 |
| **Fail** | Missing packages, install error, or type errors |
| **Prerequisites** | B1 (catalog for effect) |
| **Parallel** | After B1; parallel with B2 |
| **Notes** | Existing packages (api, auth, config, db, env) are PRESERVED — do NOT touch. Follow `exports` field pattern from existing packages (`./*` wildcard). |

### B4 — Document Effect+SQLite wrapping pattern (ADR)
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `docs/architecture/decisions/adr-effect-sqlite.md` — short ADR: no official Effect-Drizzle-SQLite bridge, use `Effect.tryPromise(() => db.query(...))`, tagged errors via Effect Data. Max 30 lines. |
| **Files** | 1 new markdown file |
| **Verification** | `test -f docs/architecture/decisions/adr-effect-sqlite.md && echo PASS` |
| **Pass** | PASS printed |
| **Fail** | File missing |
| **Prerequisites** | None |
| **Parallel** | YES — with B1-B3 |

### B5 — Module wiring sanity (all new packages resolvable)
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent |
| **Deliverable** | `packages/scripts/src/module-wiring-smoke.ts` importing all 12 new package entrypoints (`@chiron/contracts`, `@chiron/workflow-engine`, `@chiron/agent-runtime`, `@chiron/tooling-engine`, `@chiron/event-bus`, `@chiron/variable-service`, `@chiron/template-engine`, `@chiron/provider-registry`, `@chiron/sandbox-engine`, `@chiron/ax-engine`, `@chiron/methodology-engine`, `@chiron/scripts`) and exiting cleanly. |
| **Files** | `packages/scripts/src/module-wiring-smoke.ts`, optional script alias in `packages/scripts/package.json` |
| **Verification** | `bun --filter @chiron/scripts run module:wiring-smoke 2>&1; echo "EXIT:$?"` |
| **Pass** | Exit 0 (all imports resolve in workspace) |
| **Fail** | Any module resolution error |
| **Prerequisites** | B3 complete |
| **Parallel** | After B3; can run with B4 |
| **Notes** | This is dependency/wiring proof only. Do NOT add runtime/business logic. |

### B-GATE — Phase B Stop Gate
| Field | Value |
|---|---|
| **Owner** | Orchestrator (automatic) |
| **Verification** | `ls -d packages/*/src/index.ts \| wc -l && bun install && bun check-types && bun --filter @chiron/scripts run module:wiring-smoke` |
| **Pass** | 17 packages counted, install exit 0, typecheck exit 0, module wiring smoke exit 0 |
| **Fail** | Wrong count, install error, or type errors → fix before Phase C |
| **Action on Pass** | Commit: `chore(baseline): add effect/reactflow catalogs, scaffold 12 package skeletons, verify module wiring` |

---

<!-- PHASE_C_START -->

## Phase C — Frontend Token / Font / Design Baseline

**Goal**: Fonts load/render correctly and canonical color-family references are present without visual remap.
**Stop Gate**: Dev server renders text in Commit Mono (verified via Playwright screenshot).
**Prerequisite**: Phase B stop gate PASSED.
**SCOPE LOCK**: Fonts + font-family CSS vars + semantic color-family alias contract ONLY. Full design token implementation = story work.

### C0 — Add canonical color-family alias contract (no visual change)
| Field | Value |
|---|---|
| **Owner** | `visual-engineering` agent |
| **Deliverable** | `apps/web/src/index.css` includes canonical semantic family aliases from UX spec: `--color-carbon`, `--color-frost`, `--color-camo`, `--color-winter`, `--color-terrain`, `--color-fluo`, `--color-alert`, `--color-dawn`. |
| **Files** | `apps/web/src/index.css` |
| **What to change** | Add ONLY alias variables in `:root` and `.dark` mapping to existing shadcn tokens. Example: `--color-alert: var(--destructive)`, `--color-terrain: var(--primary)`, `--color-carbon: var(--background)`. Do not change existing component token consumption yet. |
| **Must NOT do** | No palette redesign. No replacing existing token names in components. No color reskin in this phase. |
| **Verification** | `grep -E 'color-(carbon|frost|camo|winter|terrain|fluo|alert|dawn)' apps/web/src/index.css` |
| **Pass** | All 8 semantic aliases present in CSS |
| **Fail** | Any alias missing |
| **Prerequisites** | Phase B gate passed |
| **Parallel** | YES — can run in parallel with C1 |


### C1 — Source and install Commit Mono + Geist Pixel font files
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent (requires web research for font files) |
| **Deliverable** | Font WOFF2 files in `apps/web/public/fonts/`. Commit Mono: Regular, Bold, Italic. Geist Pixel: all 5 available variants. |
| **Files** | `apps/web/public/fonts/commit-mono-*.woff2`, `apps/web/public/fonts/geist-pixel-*.woff2` |
| **Sourcing** | Commit Mono: `https://commitmono.com` (free, OFL license). Geist Pixel: check vercel/geist-font repo or npm. If @fontsource packages exist, prefer those. |
| **Verification** | `ls apps/web/public/fonts/*.woff2 \| wc -l` |
| **Pass** | ≥ 4 font files present |
| **Fail** | No font files or wrong format |
| **Prerequisites** | Phase B gate passed |
| **Parallel** | YES — can start immediately in Phase C |

### C2 — Add @font-face declarations and update CSS custom properties
| Field | Value |
|---|---|
| **Owner** | `visual-engineering` agent |
| **Deliverable** | `apps/web/src/index.css` updated: @font-face for each font, `--font-sans` changed to Commit Mono, new `--font-pixel` var for Geist Pixel |
| **Files** | `apps/web/src/index.css` |
| **What to change** | 1) Add @font-face blocks for each WOFF2 file. 2) Replace `--font-sans: "Inter Variable"` with `--font-sans: "Commit Mono", ui-monospace, monospace`. 3) Add `--font-pixel: "Geist Pixel", monospace`. 4) Update @theme block with `--font-pixel: var(--font-pixel)`. |
| **Must NOT do** | Do NOT touch color tokens, spacing, radius, shadow, or motion. Do NOT modify shadcn components. |
| **Verification** | `grep 'Commit Mono' apps/web/src/index.css && grep 'font-pixel' apps/web/src/index.css` |
| **Pass** | Both greps find matches |
| **Fail** | Either grep returns empty |
| **Prerequisites** | C1 (font files exist) |
| **Parallel** | After C1 |

### C3 — Verify font rendering via dev server
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent (with `playwright` skill) |
| **Deliverable** | Screenshot evidence of font rendering. Save to `.sisyphus/evidence/fonts-rendering.png` |
| **Steps** | 1) `bun dev` (start dev server). 2) Playwright navigate to `http://localhost:3001`. 3) Screenshot page. 4) Verify monospace rendering (Commit Mono, not Inter/system). |
| **Verification** | `test -f .sisyphus/evidence/fonts-rendering.png && echo PASS` |
| **Pass** | Screenshot exists, shows monospace text |
| **Fail** | Missing screenshot or wrong font |
| **Prerequisites** | C2 |
| **Parallel** | After C2 (sequential) |

### C-GATE — Phase C Stop Gate
| Field | Value |
|---|---|
| **Owner** | Orchestrator |
| **Verification** | `bun check-types && grep 'Commit Mono' apps/web/src/index.css && ls apps/web/public/fonts/*.woff2 \| wc -l` |
| **Pass** | Typecheck exit 0, Commit Mono in CSS, ≥ 4 font files |
| **Fail** | Any fails → fix before Phase D |
| **Action on Pass** | Commit: `feat(baseline): add Commit Mono + Geist Pixel fonts, update CSS vars` |

---

<!-- PHASE_D_START -->

## Phase D — oRPC + SSE Smoke Paths

**Goal**: Typed oRPC round-trip (web→server→web) + SSE stream (server→web live).
**Stop Gate**: Both smoke curl commands return expected output.
**Prerequisite**: Phase C stop gate PASSED.


### D1 — Verify existing oRPC smoke path
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | Verification that existing `healthCheck` procedure works end-to-end. No code changes expected. |
| **Steps** | 1) Start server: `bun --filter server dev`. 2) `curl http://localhost:3000/rpc/healthCheck`. 3) Verify typed response. |
| **Verification** | `curl -s http://localhost:3000/rpc/healthCheck` |
| **Pass** | Returns `"OK"` (or JSON containing OK) |
| **Fail** | Connection refused, 500, or wrong response |
| **Prerequisites** | Phase C gate |
| **Parallel** | YES — with D2 (server must be running) |

### D2 — Add SSE smoke endpoint to server
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent (with `hono` skill) |
| **Deliverable** | `GET /sse/smoke` endpoint: streams timestamp event every 1s for 5s using `streamSSE` from `hono/streaming`. |
| **Files** | `apps/server/src/index.ts` |
| **Implementation** | `app.get('/sse/smoke', (c) => streamSSE(c, async (stream) => { for (let i=0; i<5; i++) { await stream.writeSSE({ data: JSON.stringify({ tick: i, ts: Date.now() }), event: 'tick' }); await stream.sleep(1000); }}))` |
| **Must NOT do** | No Effect services. No event bus. No pub/sub. MINIMAL smoke. |
| **Verification** | `curl -N -H 'Accept: text/event-stream' http://localhost:3000/sse/smoke 2>&1 \| head -10` |
| **Pass** | Shows `event: tick` and `data:` lines |
| **Fail** | No SSE events or connection error |
| **Prerequisites** | Phase C gate |
| **Parallel** | YES — with D1, D3 (parallel) |

### D3 — Add SSE consumer hook + oRPC typed call to web dashboard
| Field | Value |
|---|---|
| **Owner** | `unspecified-high` agent |
| **Deliverable** | 1) `apps/web/src/lib/use-sse.ts` — hook: `useSSE(url)` → `{ events, status }` using native `EventSource`. 2) Dashboard route updated: shows SSE ticks + oRPC healthCheck response. |
| **Files** | `apps/web/src/lib/use-sse.ts` (new), `apps/web/src/routes/dashboard.tsx` (update) |
| **Must NOT do** | No reconnection. No global state. No event schema types. Smoke only. |
| **Verification** | Playwright: navigate to `http://localhost:3001/dashboard`, wait 3s, assert tick count visible on page. |
| **Pass** | Dashboard shows live SSE ticks + oRPC result |
| **Fail** | No updates or EventSource errors |
| **Prerequisites** | D2 (SSE endpoint exists) |
| **Parallel** | After D2 |

### D-GATE — Phase D Stop Gate
| Field | Value |
|---|---|
| **Owner** | Orchestrator |
| **Verification** | `curl -s http://localhost:3000/rpc/healthCheck` returns OK; `curl -N http://localhost:3000/sse/smoke 2>&1 \| head -3` shows SSE events |
| **Pass** | Both produce expected output |
| **Fail** | Either fails → fix before Phase E |
| **Action on Pass** | Commit: `feat(baseline): add SSE smoke endpoint + web consumer, verify oRPC e2e` |

---

<!-- PHASE_E_START -->

## Phase E — Quality Gates + Docs Alignment + Sprint Handoff

**Goal**: All 7 sprint-readiness gates pass. Evidence captured. GO for sprint planning.
**Stop Gate**: All 7 gates PASS with evidence in `.sisyphus/evidence/`.
**Prerequisite**: Phase D stop gate PASSED.


### E1 — Full doc alignment scan
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | Grep scan for stale refs. Fix any remaining tRPC/PostgreSQL/stale refs missed by Phase A. |
| **Verification** | `grep -ril 'trpc\|tRPC\|PostgreSQL\|postgres\|5434' _bmad-output/planning-artifacts/*.md docs/architecture/*.md _bmad-output/project-context.md 2>/dev/null` |
| **Pass** | Returns empty |
| **Fail** | Any file returned → fix it |
| **Prerequisites** | Phase D gate |
| **Parallel** | YES — with E2, E3 |

### E2 — Run full quality gate suite with evidence capture
| Field | Value |
|---|---|
| **Owner** | `deep` agent |
| **Deliverable** | `.sisyphus/evidence/sprint-readiness-evidence.md` with 7 gates, each: command → output → PASS/FAIL |
| **Gates** | Gate 1: `bun install` exit 0. Gate 2: `bun check-types` exit 0. Gate 3: `bun check` exit 0. Gate 4: `bun run test` exit 0 (≥1 pass). Gate 5: oRPC curl → OK. Gate 6: SSE curl → event:tick. Gate 7: doc grep → empty. |
| **Verification** | `test -f .sisyphus/evidence/sprint-readiness-evidence.md && grep -c 'PASS' .sisyphus/evidence/sprint-readiness-evidence.md` |
| **Pass** | 7 PASS entries |
| **Fail** | File missing or any FAIL |
| **Prerequisites** | Phase D gate + server running |
| **Parallel** | After E1 |

### E3 — Update project-context.md with accurate commands
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `_bmad-output/project-context.md` commands section lists ONLY working scripts: `bun dev`, `bun build`, `bun check-types`, `bun check`, `bun run test`, `bun db:push`, `bun db:generate`, `bun db:studio`. |
| **Verification** | Every listed command has a corresponding turbo.json task or package.json script |
| **Pass** | Zero phantom commands |
| **Fail** | Any non-existent command documented |
| **Prerequisites** | A4 (vitest configured) |
| **Parallel** | YES — with E1, E2 |

### E4 — Shadcn registries deferred setup contract (explicitly tracked)
| Field | Value |
|---|---|
| **Owner** | `quick` agent |
| **Deliverable** | `_bmad-output/planning-artifacts/deferred-shadcn-registries.md` documenting: (1) registries to adopt later, (2) component intake policy (official shadcn first), (3) trigger gate for when registry bootstrap is allowed (post-reset, during story implementation), (4) non-goal for reset baseline. |
| **Verification** | `test -f _bmad-output/planning-artifacts/deferred-shadcn-registries.md && grep -E 'post-reset|non-goal|registry' _bmad-output/planning-artifacts/deferred-shadcn-registries.md` |
| **Pass** | File exists and includes deferment contract keywords |
| **Fail** | File missing or vague/no deferment criteria |
| **Prerequisites** | None |
| **Parallel** | YES — with E1, E3 |
| **Notes** | This is NOT registry implementation. It prevents drift by making deferment explicit. |

### E-GATE (FINAL)
| Field | Value |
|---|---|
| **Owner** | Orchestrator |
| **Verification** | `.sisyphus/evidence/sprint-readiness-evidence.md` exists with 7/7 PASS |
| **Pass** | ALL gates PASS → GO gate |
| **Fail** | Any FAIL → root-cause and fix |
| **Commit** | `chore(baseline): sprint-readiness gates verified, evidence captured` |

---

## Delegation Map
| Task | Agent Category | Skills | Rationale |
|---|---|---|---|
| A1: Fix tRPC refs (artifacts) | `quick` | — | Simple text replacement in markdown |
| A2: Fix PostgreSQL refs | `quick` | — | Simple text replacement |
| A3: Fix tRPC refs (docs/) | `quick` | — | Simple text replacement |
| A4: Configure vitest | `unspecified-high` | — | Config wiring across turbo+vitest+packages |
| A5: Align web tsconfig | `quick` | — | Single config file + minor type fixes |
| B1: Catalog entries | `quick` | — | Single file edit (root package.json) |
| B2: Web deps | `quick` | — | Single file edit (web package.json) |
| B3: 12 package skeletons | `unspecified-high` | — | Repetitive but must match conventions |
| B4: ADR document | `quick` | — | Short markdown document |
| C1: Source font files | `unspecified-high` | — | Web research + file acquisition |
| C2: CSS font declarations | `visual-engineering` | — | Tailwind + CSS custom properties |
| C3: Font rendering verify | `unspecified-high` | `playwright` | Browser automation for visual QA |
| D1: Verify oRPC smoke | `quick` | — | Single curl command |
| D2: SSE smoke endpoint | `unspecified-high` | `hono` | Hono streaming API |
| D3: SSE consumer + oRPC | `unspecified-high` | — | React hooks + EventSource |
| E1: Doc alignment scan | `quick` | — | Grep + fix residuals |
| E2: Gate suite evidence | `deep` | — | Comprehensive verification |
| E3: Update project-context | `quick` | — | Simple text corrections |
| E4: Track deferred shadcn registries | `quick` | — | Explicit deferment contract to avoid scope drift |

**Parallelism**: A=5 parallel → B=3 waves → C=3 sequential → D=2 waves → E=2 waves. ~5 sequential checkpoints total.

---

## Day-0 Runbook (Strict Order)

```
STEP 1: VERIFY BASELINE              [███░░░░░░░]
  $ git log --oneline -1             # Confirm HEAD = 260f969b8
  $ bun install                      # exit 0
  $ bun check-types                  # exit 0
  $ bun check                        # exit 0
  → STOP-GATE: ALL exit 0? If NO → fix first.

STEP 2: PHASE A (Hardening)          [█████░░░░░]
  A1+A2+A3+A4+A5 parallel.
  $ bun install && bun check-types && bun check && bun run test
  → STOP-GATE: ALL exit 0? Commit.

STEP 3: PHASE B (Skeletons)          [██████░░░░]
  B1 first, then B2+B3+B4 parallel.
  $ ls packages/ | wc -l             # = 17
  $ bun install && bun check-types   # exit 0
  → STOP-GATE: 17 packages + exit 0? Commit.

STEP 4: PHASE C (Fonts)              [███████░░░]
  C1 → C2 → C3 (sequential).
  $ grep 'Commit Mono' apps/web/src/index.css
  $ bun check-types
  → STOP-GATE: Font in CSS + typecheck? Commit.

STEP 5: PHASE D (Smoke)              [████████░░]
  Start server. D1+D2 parallel, then D3.
  $ curl localhost:3000/rpc/healthCheck
  $ curl -N localhost:3000/sse/smoke | head -5
  → STOP-GATE: Both return expected? Commit.

STEP 6: PHASE E (Gates)              [█████████░]
  E1+E3 parallel, then E2 evidence.
  $ test -f .sisyphus/evidence/sprint-readiness-evidence.md
  → STOP-GATE: 7/7 PASS? Commit.

STEP 7: GO GATE                      [██████████]
  Read evidence. All 10 gates pass? → /bmad-bmm-sprint-planning
```

**NEVER skip a stop gate. Fix failures at the phase that caused them.**

---

## Top 5 Reset-Context Risks & Mitigations
| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **No official Effect+Drizzle-SQLite bridge** | High — pattern unclear | ADR B4 documents `Effect.tryPromise` wrapping. Implement in stories. |
| 2 | **Font files unavailable or licensing** | Medium — blocks Phase C | Commit Mono = OFL (free). Geist Pixel = check vercel repo. Fallback: @fontsource packages or Fira Code interim. |
| 3 | **Stale doc refs leak into sprint** | Medium — agents build wrong spec | Phase A + E1 run comprehensive grep. Sprint agents use `_bmad-output/` only. |
| 4 | **12 skeletons break turbo graph** | Low — slow first build | Empty `export {}` = clean graph. Cold cache on first build is expected. |
| 5 | **Zod 4 + Effect Schema dual-schema** | Medium — type confusion | Defer to stories. oRPC = pure Zod boundary. contracts = Effect Schema. Conversion at API layer. |

---

## Final GO Gate for `/bmad-bmm-sprint-planning`
**ALL must be TRUE:**

| # | Gate | Command | Expected |
|---|---|---|---|
| 1 | Install | `bun install; echo $?` | 0 |
| 2 | Types | `bun check-types; echo $?` | 0 |
| 3 | Lint | `bun check; echo $?` | 0 |
| 4 | Tests | `bun run test; echo $?` | 0 (≥1 pass) |
| 5 | oRPC | `curl -s localhost:3000/rpc/healthCheck` | "OK" |
| 6 | SSE | `curl -N localhost:3000/sse/smoke \| head -5` | `event: tick` |
| 7 | Docs | `grep -ril 'trpc' _bmad-output/planning-artifacts/*.md` | Empty |
| 8 | Packages | `ls packages/ \| wc -l` | 17 |
| 9 | Fonts | `ls apps/web/public/fonts/*.woff2 \| wc -l` | ≥4 |
| 10 | Evidence | `test -f .sisyphus/evidence/sprint-readiness-evidence.md` | Exists |

**10/10 → Run `/bmad-bmm-sprint-planning`** | **Any fail → Fix, re-run phase, re-capture.**

---

## Commit Strategy

| Phase | Message | Scope |
|---|---|---|
| A | `chore(docs): fix tRPC→oRPC refs, configure vitest, harden tsconfig` | docs + config |
| B | `chore(packages): add Effect catalog, create 12 package skeletons, verify module wiring` | packages/ + root |
| C | `feat(web): configure Commit Mono + Geist Pixel typography` | apps/web |
| D | `feat: add oRPC + SSE smoke endpoints` | apps/server + apps/web + packages/api |
| E | `docs: sprint-readiness evidence, final alignment` | docs + .sisyphus |

## Success Criteria

```bash
bun install           # Exit 0, no warnings
bun check-types       # Exit 0, all packages compile
bun check             # Exit 0, lint + format clean
bun run test          # Exit 0, baseline test passes
curl localhost:3000/rpc/healthCheck  # Returns "OK"
curl -N localhost:3000/sse/smoke     # Returns data: lines
grep -rl "tRPC\|trpc" _bmad-output/planning-artifacts/*.md docs/**/*.md  # Empty
ls packages/ | wc -l  # 17
```
