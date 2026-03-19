# Methodology Design-Time and Runtime Boundary Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock a clear architecture where methodology design-time ownership lives in `@chiron/methodology-engine` with phased boundaries: L1 handles version-level authoring and work-unit metadata, L2 owns full work-unit domain state, and L3 owns workflow internals.

**Architecture:** Keep `methodology version` as the publish/release aggregate root and execute migration in strict layers: L1 (`methodology versions`, `methodology facts`, `methodology agents`, `dependency definitions`, `work-unit metadata`), L2 (work-unit domain: metadata relocation, work-unit facts, workflows, state machine), L3 (workflow domain: step definitions and handler-definition CRUD). Keep runtime-facing contract shape stable while execution internals evolve. Use Effect layer composition so service interfaces stay dependency-light and wiring happens at the composition root.

**Tech Stack:** TypeScript, Effect (`Context.Tag`, `Layer`), oRPC/Hono API router, Drizzle repositories, TanStack web authoring UI, BMAD architecture artifacts.

---

### Task 1: Lock Canonical Architecture Wording (Docs First)

**Files:**
- Modify: `docs/architecture/chiron-module-structure.md`
- Modify: `docs/architecture/modules/README.md`

**Step 1: Add ownership model section**

Document canonical ownership:
- Version owns publish/lineage/projection release.
- Work Unit owns facts/state machine/workflows/workflow bindings.
- Workflow owns steps and edges.

**Step 2: Add dependency-direction rules**

Document that runtime modules:
- consume contracts and published projections,
- do not import methodology-engine repositories or design-time mutation services.

**Step 3: Add architecture disclaimer**

Add explicit text:
- execution services/modules are provisional and expected to evolve,
- design-time contracts and runtime-facing published contracts are stability anchors.

**Step 4: Verify doc consistency**

Run: `grep -n "workflow" docs/architecture/chiron-module-structure.md docs/architecture/modules/README.md`
Expected: updated ownership language appears and no contradictory wording remains.

---

### Task 2: Align BMAD Canonical Artifacts

**Files:**
- Modify: `_bmad-output/planning-artifacts/architecture.md`
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Update planning architecture ownership text**

Replace version-root workflow ownership phrasing with work-unit-owned workflow language while preserving version as publish root.

**Step 2: Add design-time vs runtime boundary notes**

Make dependency direction explicit:
- methodology-engine authoritative for design-time definitions,
- runtime packages consume published runtime contracts only.

**Step 3: Add provisional execution disclaimer**

Add section indicating runtime module internals (execution orchestration, adapters, wiring) can change significantly while contract boundaries remain stable.

**Step 4: Verify references still coherent**

Run: `grep -n "workflow binding\|methodology-engine\|runtime" _bmad-output/planning-artifacts/architecture.md _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
Expected: updated terms are present and aligned with docs in `docs/architecture`.

---

### Task 3: Record Story 3.1 Architectural Divergence

**Files:**
- Modify: `docs/plans/2026-03-18-story-3-1-l1-completion-design.md`

**Step 1: Add architectural divergence addendum**

Append a short addendum that states:
- Story 3.1 delivered UI/API L1 scope,
- canonical ownership now shifts to work-unit-owned workflows,
- compatibility seams may remain temporarily until L1/L2 refactor execution.

**Step 2: Link to this plan**

Reference `docs/plans/2026-03-19-methodology-design-runtime-boundary-refactor-plan.md` as the implementation sequence source.

**Step 3: Verify no Story 3.1 acceptance drift**

Run: `grep -n "Out of scope\|Acceptance Criteria\|Addendum" docs/plans/2026-03-18-story-3-1-l1-completion-design.md`
Expected: original Story 3.1 outcomes remain intact; divergence is clearly additive.

---

### Task 4: L1/L2/L3 Refactor Execution Skeleton (Planned, Not Yet Executed)

**Files:**
- Future modify: `packages/contracts/src/methodology/version.ts`
- Future modify: `packages/methodology-engine/src/version-service.ts`
- Future modify: `packages/methodology-engine/src/lifecycle-service.ts`
- Future modify: `packages/methodology-engine/src/repository.ts`
- Future modify: `packages/db/src/methodology-repository.ts`
- Future modify: `packages/api/src/routers/methodology.ts`

**Step 1: L1 service boundary plan (version-level only)**

Define and wire L1 services for only these domains:
- `MethodologyVersionService`: version lifecycle, publish, and top-level orchestration,
- version-level `facts`, `agents`, and `dependency definitions` operations,
- `work-unit metadata` operations only (no work-unit facts, workflows, or state-machine CRUD in L1).

L1 completion criteria:
- route wiring and service interfaces reflect only the L1 domain list,
- no introduction of L2/L3 write ownership in L1 scope.

**Step 2: L2 service boundary plan (work-unit domain)**

Define L2 ownership and services for work-unit internals:
- migrate metadata ownership from L1 to L2,
- add work-unit facts CRUD,
- add workflows under work-unit ownership,
- add state-machine CRUD (states/transitions and transition-workflow bindings).

L2 completion criteria:
- work-unit aggregate is authoritative for its internal facts/workflows/state machine,
- compatibility adapters exist for any temporary version-root readers.

**Step 3: L3 service boundary plan (workflow domain)**

Define workflow-internal authoring services:
- workflow step definitions CRUD,
- handler-definition CRUD across step kinds,
- workflow-level validation seams.

L3 completion criteria:
- step/handler-definition mutations are isolated from L1/L2 mutation paths,
- workflow contracts remain runtime-consumable without design-time persistence leakage.

**Step 4: Runtime resolver contract plan (cross-layer read boundary)**

Define published read contracts that runtime modules consume at all phases:
- `MethodologyRuntimeResolver`,
- `WorkUnitRuntimeResolver`,
- `WorkflowRuntimeResolver`,
- `StepContractResolver`.

Rule: runtime packages consume published contracts/projections only and must not import methodology-engine mutation or repository seams.

**Step 5: Refactor test plan (TDD-first by layer)**

Before implementation of each layer, add failing tests specific to that layer:
- L1: version/fact/agent/dependency/work-unit-metadata route-to-service boundaries,
- L2: work-unit-scoped workflow identity and transition-binding scope,
- L3: step/handler definition CRUD and validation,
- cross-layer: resolver contract stability and compatibility adapter parity for existing readers.

---

### Task 5: Verification and Handoff

**Files:**
- Modify: `docs/plans/2026-03-19-methodology-design-runtime-boundary-refactor-plan.md` (checklist updates)

**Step 1: Run documentation consistency checks**

Run:
- `bun run check` (or repository docs/lint command)
- `grep -n "work-unit-owned\|publish root\|provisional" docs/architecture/*.md docs/architecture/modules/*.md _bmad-output/planning-artifacts/architecture.md`

Expected: no contradictory architecture language across canonical docs.

**Step 2: Capture final summary block**

Record the canonical model in a short section:
- ownership hierarchy,
- dependency direction,
- stability disclaimer.

**Step 3: Commit in focused docs commit**

Run:
`git add docs/plans/2026-03-19-methodology-design-runtime-boundary-refactor-plan.md docs/architecture/chiron-module-structure.md docs/architecture/modules/README.md docs/plans/2026-03-18-story-3-1-l1-completion-design.md _bmad-output/planning-artifacts/architecture.md _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

`git commit -m "docs(architecture): lock design-time/runtime ownership boundaries"`

Expected: one coherent docs commit, ready for subsequent L1/L2 implementation sessions.
