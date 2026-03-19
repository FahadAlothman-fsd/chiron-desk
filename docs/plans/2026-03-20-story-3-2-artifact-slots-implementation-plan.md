# Story 3.2 Artifact Slots Implementation Plan

> Superseded as the primary execution plan by `docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md`.
> Keep this document as an artifact-slot deep-dive reference only.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement design-time Artifact Slots (slot + nested templates) for Work Unit L2 using the frozen minimal schema and nested API/UI ownership model.

**Architecture:** Add two design-time tables (`methodology_artifact_slot_definitions`, `methodology_artifact_slot_templates`) with strict scope keys and no redundant template metadata. Implement repository + methodology-engine service + nested router procedures under `methodology.version.workUnit.artifactSlot.*`, then wire the `Artifact Slots` tab with slot-first table and templates managed inside Slot Details dialog.

**Tech Stack:** TypeScript, Bun, Drizzle ORM (SQLite), Effect, oRPC/Hono, TanStack Router, React, Vitest/Bun test.

---

### Task 1: Lock persistence schema for slots/templates

**Files:**
- Modify: `packages/db/src/schema/methodology.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

**Step 1: Write the failing test**

In `methodology-repository.integration.test.ts`, add assertions that expect:
- slot definitions table and template table to exist in test schema fixture,
- unique key behavior per `(methodologyVersionId, workUnitTypeId, key)` for slots,
- unique key behavior per `(slotDefinitionId, key)` for templates.

Use schema names exactly:
- `methodology_artifact_slot_definitions`
- `methodology_artifact_slot_templates`

**Step 2: Run test to verify it fails**

Run: `bun test "src/tests/repository/methodology-repository.integration.test.ts"`
Working directory: `packages/db`
Expected: FAIL because tables/constraints are not present yet.

**Step 3: Write minimal implementation**

In `packages/db/src/schema/methodology.ts`, add:

1) `methodologyArtifactSlotDefinitions`:
- `id`
- `methodologyVersionId` FK -> `methodologyVersions.id` (cascade)
- `workUnitTypeId` FK -> `methodologyWorkUnitTypes.id` (cascade)
- `key`
- `displayName`
- `descriptionJson`
- `guidanceJson`
- `cardinality` (`single` or `fileset`)
- `rulesJson` (optional JSON)
- `createdAt`
- `updatedAt`

Indexes:
- unique `(methodologyVersionId, workUnitTypeId, key)`
- index `(methodologyVersionId, workUnitTypeId)`

2) `methodologyArtifactSlotTemplates`:
- `id`
- `slotDefinitionId` FK -> `methodologyArtifactSlotDefinitions.id` (cascade)
- `key`
- `displayName`
- `descriptionJson`
- `guidanceJson`
- `content`
- `createdAt`
- `updatedAt`

Indexes:
- unique `(slotDefinitionId, key)`
- index `(slotDefinitionId)`

Do **not** add: `purpose`, `allowedNamespacesJson`, `defaultContentJson`, or separate `variables` column.

**Step 4: Run test to verify it passes**

Run: `bun test "src/tests/repository/methodology-repository.integration.test.ts"`
Working directory: `packages/db`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/db/src/schema/methodology.ts packages/db/src/schema/index.ts packages/db/src/tests/repository/methodology-repository.integration.test.ts
git commit -m "feat(db): add artifact slot and template schema"
```

---

### Task 2: Add contracts for artifact slots/templates

**Files:**
- Create: `packages/contracts/src/methodology/artifact-slot.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

In `packages/api/src/tests/routers/methodology.test.ts`, add schema decode/shape tests for new artifact-slot inputs:
- slot create/update payload,
- template create/update payload,
- list filters scoped by methodology version + work unit key.

Expected payload fields must match frozen schema decisions and must **not** include dropped fields.

**Step 2: Run test to verify it fails**

Run: `bun test "src/tests/routers/methodology.test.ts"`
Working directory: `packages/api`
Expected: FAIL because contract exports/types do not exist yet.

**Step 3: Write minimal implementation**

Create `packages/contracts/src/methodology/artifact-slot.ts` with Effect Schema definitions:
- `ArtifactSlotCardinality = "single" | "fileset"`
- slot entity/input schemas
- template entity/input schemas
- list/get/create/update/delete DTO shapes for nested router usage

Update `packages/contracts/src/methodology/index.ts` to export `artifact-slot` contracts.

**Step 4: Run test to verify it passes**

Run: `bun test "src/tests/routers/methodology.test.ts"`
Working directory: `packages/api`
Expected: PASS for new contract-shape assertions.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/artifact-slot.ts packages/contracts/src/methodology/index.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(contracts): add artifact slot and template schemas"
```

---

### Task 3: Add repository CRUD for slots/templates

**Files:**
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

**Step 1: Write the failing test**

Extend repository integration tests with scenarios:
- create/list/update/delete slot definition scoped to version + work unit type,
- create/list/update/delete template scoped to slot definition,
- deleting slot cascades template deletes,
- duplicate keys are rejected by unique constraints.

**Step 2: Run test to verify it fails**

Run: `bun test "src/tests/repository/methodology-repository.integration.test.ts"`
Working directory: `packages/db`
Expected: FAIL because repository methods are missing.

**Step 3: Write minimal implementation**

In `packages/db/src/methodology-repository.ts`, add methods for:
- `listArtifactSlotDefinitions(...)`
- `createArtifactSlotDefinition(...)`
- `updateArtifactSlotDefinition(...)`
- `deleteArtifactSlotDefinition(...)`
- `listArtifactSlotTemplates(...)`
- `createArtifactSlotTemplate(...)`
- `updateArtifactSlotTemplate(...)`
- `deleteArtifactSlotTemplate(...)`

Follow current repository patterns for transactions, row mapping, and timestamp behavior.

**Step 4: Run test to verify it passes**

Run: `bun test "src/tests/repository/methodology-repository.integration.test.ts"`
Working directory: `packages/db`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/db/src/methodology-repository.ts packages/db/src/tests/repository/methodology-repository.integration.test.ts
git commit -m "feat(db): add artifact slot repository operations"
```

---

### Task 4: Implement methodology-engine artifact slot service + layer wiring

**Files:**
- Create: `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`
- Modify: `packages/methodology-engine/src/services/work-unit-service.ts`
- Modify: `packages/methodology-engine/src/layers/live.ts`
- Modify: `packages/methodology-engine/src/index.ts`
- Test: `packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts`
- Create/Test: `packages/methodology-engine/src/tests/l2-l3/work-unit-artifact-slot-service.test.ts`

**Step 1: Write the failing test**

Add service-level tests for:
- slot CRUD orchestration against repository,
- template CRUD under a slot,
- scope guards (version/work unit mismatch),
- no acceptance of dropped fields.

**Step 2: Run test to verify it fails**

Run: `bun test "src/tests/l2-l3/work-unit-artifact-slot-service.test.ts"`
Working directory: `packages/methodology-engine`
Expected: FAIL because service does not exist.

**Step 3: Write minimal implementation**

Create service with Effect-style interface/live implementation using existing transaction/repository boundaries.
Wire into `live.ts` and `index.ts` exports.

**Step 4: Run test to verify it passes**

Run: `bun test "src/tests/l2-l3/work-unit-artifact-slot-service.test.ts"`
Working directory: `packages/methodology-engine`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts packages/methodology-engine/src/services/work-unit-service.ts packages/methodology-engine/src/layers/live.ts packages/methodology-engine/src/index.ts packages/methodology-engine/src/tests/l2-l3/work-unit-artifact-slot-service.test.ts packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts
git commit -m "feat(methodology-engine): add work unit artifact slot service"
```

---

### Task 5: Add nested API procedures under workUnit.artifactSlot

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add router tests for:
- `methodology.version.workUnit.artifactSlot.{list,create,update,delete}`
- `methodology.version.workUnit.artifactSlot.template.{list,create,update,delete}`
- scope and validation behavior.

**Step 2: Run test to verify it fails**

Run: `bun test "src/tests/routers/methodology.test.ts"`
Working directory: `packages/api`
Expected: FAIL because procedures are missing.

**Step 3: Write minimal implementation**

In `packages/api/src/routers/methodology.ts`, add nested procedures calling the new methodology-engine service.
Keep procedure naming consistent with existing `methodology.version.workUnit.*` namespaces.

**Step 4: Run test to verify it passes**

Run: `bun test "src/tests/routers/methodology.test.ts"`
Working directory: `packages/api`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add work unit artifact slot nested procedures"
```

---

### Task 6: Build Artifact Slots L2 tab + Slot Details dialog with nested templates

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
- Create: `apps/web/src/features/methodologies/work-unit-l2/components/SlotDetailsDialog.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx` (only if needed for shared query wiring)
- Create/Test: `apps/web/src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx`
- Modify/Test: `apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing test**

Add UI tests for:
- Artifact Slots tab renders slot-first table columns,
- `+ Add Slot` opens Slot Details dialog,
- dialog sections include Basics / Rules / Templates,
- templates are managed inside dialog (no separate templates page behavior).

**Step 2: Run test to verify it fails**

Run: `bun run test -- "src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx"`
Working directory: `apps/web`
Expected: FAIL because components do not exist.

**Step 3: Write minimal implementation**

Implement:
- slot list with search/filter and summary row data,
- slot create/edit/delete actions,
- nested templates table/editor inside Slot Details dialog,
- API integration to `methodology.version.workUnit.artifactSlot.*` and template sub-namespace.

Ensure no UI fields for dropped metadata (`purpose`, `allowedNamespaces`, `defaultContent`).

**Step 4: Run test to verify it passes**

Run:
- `bun run test -- "src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx"`
- `bun run test -- "src/tests/features/methodologies/version-workspace.integration.test.tsx"`
Working directory: `apps/web`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx apps/web/src/features/methodologies/work-unit-l2/components/SlotDetailsDialog.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx
git commit -m "feat(web): implement artifact slots tab with nested templates dialog"
```

---

### Task 7: Full verification + story artifact updates

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md`
- Modify: `docs/architecture/methodology-pages/artifact-slots-design-time.md` (if implementation deltas found)

**Step 1: Write failing checklist assertions in story artifact**

Update Story 3.2 checklist entries and Dev Agent Record placeholders so unresolved items are explicit before validation.

**Step 2: Run verification to expose failures first**

Run:
- `bun test "src/tests/repository/methodology-repository.integration.test.ts"` (cwd `packages/db`)
- `bun test "src/tests/l2-l3/work-unit-artifact-slot-service.test.ts"` (cwd `packages/methodology-engine`)
- `bun test "src/tests/routers/methodology.test.ts"` (cwd `packages/api`)
- `bun run test -- "src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx"` (cwd `apps/web`)
- `bun run check-types`

Expected: identify any final failing surfaces before claim.

**Step 3: Apply minimal fixes for any remaining failures**

Fix only what verification reveals (types, contract mismatches, route wiring gaps), then re-run failed commands.

**Step 4: Run full pass and confirm green**

Run full target set again plus:
- `bun run build`

Expected: all pass.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-2-complete-work-unit-l2-tabs-overview-workflows-artifact-slots-facts-state-machine.md
git commit -m "docs(story-3.2): record artifact slot implementation evidence"
```

---

## Final Validation Gate (must run before completion claim)

```bash
# DB
bun test "src/tests/repository/methodology-repository.integration.test.ts"

# Methodology engine
bun test "src/tests/l2-l3/work-unit-artifact-slot-service.test.ts"

# API
bun test "src/tests/routers/methodology.test.ts"

# Web
bun run test -- "src/tests/features/methodologies/work-unit-artifact-slots-tab.test.tsx"
bun run test -- "src/tests/features/methodologies/version-workspace.integration.test.tsx"

# Typecheck + build
bun run check-types
bun run build
```

Expected result: zero failing tests, zero type errors, successful build.
