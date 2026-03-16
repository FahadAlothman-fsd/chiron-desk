# Invoke Facts/Artifact Slots Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove invoke-level IO mapping/contracts from the active methodology model, replace them with facts/artifact-slot-only business data flow, and keep only minimal invoke lineage metadata for parent awareness.

**Architecture:** Treat invoke as orchestration only. Business state lives in persisted facts and artifact slots; invoke keeps a small runtime record for lineage and status. To keep v1 small, do not drop DB columns yet if they are only legacy storage; instead, block new legacy configs in validation, update seeds, and add a minimal workflow-engine lineage type that avoids payload capture.

**Tech Stack:** TypeScript, Effect, Vitest, existing methodology contracts/validation packages, workflow-engine package, canonical architecture docs.

---

### Task 1: Block legacy invoke IO in methodology validation

**Files:**
- Modify: `packages/methodology-engine/src/validation.test.ts`
- Modify: `packages/methodology-engine/src/validation.ts`

**Step 1: Write the failing tests**

Add tests that build a minimal workflow definition with an `invoke` step containing legacy keys and expect blocking diagnostics. Cover three cases:

```ts
expect(codes).toContain("LEGACY_INVOKE_BINDING_MODE")
expect(codes).toContain("LEGACY_INVOKE_IO_MAPPING")
expect(codes).toContain("LEGACY_WORKFLOW_IO_CONTRACT")
```

Suggested fixture shape:

```ts
const definition = {
  workUnitTypes: [{ key: "WU.PROJECT_CONTEXT" }],
  transitions: [{ key: "__absent__->done" }],
  transitionWorkflowBindings: { "__absent__->done": ["document-project"] },
  workflows: [{
    key: "document-project",
    inputContract: { kind: "workflow-io.v1", inputs: [] },
    outputContract: { kind: "workflow-io.v1", outputs: [] },
    steps: [{
      key: "run-child",
      type: "invoke",
      config: {
        contract: "invoke.v1",
        bindingMode: "same_work_unit",
        inputMapping: { topic: "facts.topic" },
        output: { mode: "variables", target: "context.child" },
      },
    }],
    edges: [
      { fromStepKey: null, toStepKey: "run-child" },
      { fromStepKey: "run-child", toStepKey: null },
    ],
  }],
}
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run "packages/methodology-engine/src/validation.test.ts"`
Expected: FAIL because the validator does not emit the new diagnostics yet.

**Step 3: Write minimal implementation**

In `packages/methodology-engine/src/validation.ts`, add a small invoke-config inspection branch inside the per-step loop:

```ts
if (step.type === "invoke" && step.config && typeof step.config === "object") {
  const config = step.config as Record<string, unknown>;

  if ("bindingMode" in config) {
    diagnostics.push(makeDiagnostic({
      code: "LEGACY_INVOKE_BINDING_MODE",
      scope: `definition.workflows.${workflow.key}.steps.${step.key}.config.bindingMode`,
      blocking: true,
      required: "Use targetMode with current_work_unit or child_work_unit",
      observed: "Legacy bindingMode key present",
      remediation: "Rename bindingMode to targetMode and update the value names",
    }, timestamp));
  }

  if ("inputMapping" in config || "output" in config) {
    diagnostics.push(makeDiagnostic({
      code: "LEGACY_INVOKE_IO_MAPPING",
      scope: `definition.workflows.${workflow.key}.steps.${step.key}.config`,
      blocking: true,
      required: "Invoke steps to use facts/artifact slots instead of invoke IO mapping",
      observed: "Legacy inputMapping/output keys present",
      remediation: "Remove invoke IO config and read/write persisted state through work unit facts and artifact slots",
    }, timestamp));
  }
}

if (workflow.inputContract || workflow.outputContract) {
  diagnostics.push(makeDiagnostic({
    code: "LEGACY_WORKFLOW_IO_CONTRACT",
    scope: `definition.workflows.${workflow.key}`,
    blocking: true,
    required: "Workflow invoke handoff to use persisted facts/artifact slots only",
    observed: "inputContract/outputContract present",
    remediation: "Remove workflow IO contracts from active methodology definitions",
  }, timestamp));
}
```

Keep the implementation narrow: validation only, no schema rewrite in this task.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run "packages/methodology-engine/src/validation.test.ts"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/validation.ts packages/methodology-engine/src/validation.test.ts
git commit -m "feat(methodology-engine): reject legacy invoke io config"
```

---

### Task 2: Update the canonical project-context seed to the new invoke model

**Files:**
- Modify: `packages/scripts/src/__tests__/methodology-seed-integrity.test.ts`
- Modify: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`

**Step 1: Write the failing test**

Update the seed integrity test so the seeded workflows no longer expect workflow IO contracts and the invoke step uses the new target-mode naming without legacy IO keys:

```ts
expect(workflow.inputContractJson).toBeNull()
expect(workflow.outputContractJson).toBeNull()

expect(invokeStep.configJson).toMatchObject({
  contract: "invoke.v1",
  targetMode: "current_work_unit",
  waitForCompletion: true,
  onChildError: "fail",
})
expect(invokeStep.configJson).not.toHaveProperty("bindingMode")
expect(invokeStep.configJson).not.toHaveProperty("inputMapping")
expect(invokeStep.configJson).not.toHaveProperty("output")
```

Fetch the invoke step from `methodologyCanonicalTableSeedRows.methodology_workflow_steps` by key `brownfield.context.invoke`.

**Step 2: Run test to verify it fails**

Run: `bunx vitest run "packages/scripts/src/__tests__/methodology-seed-integrity.test.ts"`
Expected: FAIL because the seed still writes legacy workflow IO contracts and invoke mapping.

**Step 3: Write minimal implementation**

In `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`:

- set `inputContractJson` and `outputContractJson` to `null` for the active workflows
- rename the invoke config key to `targetMode`
- remove `inputMapping` and `output` from `brownfield.context.invoke`
- update the step guidance so it says the sub-workflow reads/writes persisted facts and artifact slots in the current work unit

Minimal target config:

```ts
configJson: {
  stepConfigVersion: 1,
  contract: "invoke.v1",
  targetMode: "current_work_unit",
  executionMode: "single",
  workflowRef: "generate-project-context",
  waitForCompletion: true,
  onChildError: "fail",
}
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run "packages/scripts/src/__tests__/methodology-seed-integrity.test.ts"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/scripts/src/__tests__/methodology-seed-integrity.test.ts packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts
git commit -m "refactor(seeds): remove legacy invoke io from project-context slice"
```

---

### Task 3: Add minimal invoke lineage types to workflow-engine

**Files:**
- Create: `packages/workflow-engine/src/invoke.test.ts`
- Create: `packages/workflow-engine/src/invoke.ts`
- Modify: `packages/workflow-engine/src/index.ts`

**Step 1: Write the failing test**

Create a narrow test that proves the workflow engine exports lineage metadata without any payload field:

```ts
import { describe, expect, it } from "vitest";
import { createInvokeLineageRecord } from "./invoke";

describe("invoke lineage", () => {
  it("creates child-work-unit lineage metadata without business payload", () => {
    const record = createInvokeLineageRecord({
      stepKey: "run-child",
      targetMode: "child_work_unit",
      workflowKey: "conduct-brainstorming-session",
      childExecutionId: "exec_123",
      childWorkUnitRef: { workUnitId: "wu_123", workUnitTypeKey: "WU.BRAINSTORMING" },
      startedAt: "2026-03-12T00:00:00.000Z",
    });

    expect(record.status).toBe("running");
    expect(record).not.toHaveProperty("output");
    expect(record).not.toHaveProperty("payload");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run "packages/workflow-engine/src/invoke.test.ts"`
Expected: FAIL because the module does not exist yet.

**Step 3: Write minimal implementation**

Create `packages/workflow-engine/src/invoke.ts`:

```ts
export type InvokeTargetMode = "current_work_unit" | "child_work_unit";

export type InvokeLineageRecord = {
  stepKey: string;
  targetMode: InvokeTargetMode;
  workflowKey: string;
  childExecutionId: string;
  childWorkUnitRef?: {
    workUnitId: string;
    workUnitTypeKey: string;
  };
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
};

export function createInvokeLineageRecord(input: Omit<InvokeLineageRecord, "status">): InvokeLineageRecord {
  return { ...input, status: "running" };
}
```

Update `packages/workflow-engine/src/index.ts`:

```ts
export * from "./invoke";
```

Keep this task intentionally small; do not add business-data projection helpers.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run "packages/workflow-engine/src/invoke.test.ts"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/index.ts packages/workflow-engine/src/invoke.ts packages/workflow-engine/src/invoke.test.ts
git commit -m "feat(workflow-engine): add invoke lineage metadata type"
```

---

### Task 4: Rewrite canonical invoke docs around target modes and persisted-state flow

**Files:**
- Modify: `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- Modify: `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md`
- Modify: `docs/architecture/workflow-engine/agent-continuation-contract.md`
- Modify: `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`

**Step 1: Write the failing consistency check**

Run two grep checks against the canonical docs and note the current failures:

Run: `grep -R "bindingMode\|inputMapping\|output:" docs/architecture/workflow-engine docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
Expected: MATCHES found

Run: `grep -R "child_work_units" docs/architecture/workflow-engine docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
Expected: MATCHES found

**Step 2: Rewrite the docs**

Update the docs so they all agree on these points:

- invoke is orchestration only
- business data exchange happens through work unit facts and artifact slots
- minimal invoke metadata is lineage only
- naming uses `targetMode: current_work_unit | child_work_unit`
- `contextAttachments` for resumed agents should reference persisted child state or derived attachments, not invoke output blobs

Replace the old config example with a minimal one:

```ts
type InvokeStepConfigV1 = {
  stepConfigVersion: "invoke.v1";
  targetMode: "current_work_unit" | "child_work_unit";
  workflowSource: "fixed" | "variable" | "forEachItem";
  invocation: {
    executionMode?: "single" | "sequential" | "parallel";
    concurrency?: number;
    waitForCompletion?: boolean;
    onChildError?: "fail" | "continue" | "pause";
  };
  workflowRef?: { workflowKey?: string; workflowId?: string };
  childWorkUnitTypeKey?: string;
  activationTransitionKey?: string;
  guidance?: { human?: string; agent?: string };
};
```

**Step 3: Run the consistency check again**

Run: `grep -R "bindingMode\|inputMapping\|output:" docs/architecture/workflow-engine docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
Expected: no matches in the canonical invoke sections you updated

Run: `grep -R "child_work_units" docs/architecture/workflow-engine docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
Expected: no matches

**Step 4: Commit**

```bash
git add docs/architecture/methodology-pages/workflow-editor/invoke-step.md docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md docs/architecture/workflow-engine/agent-continuation-contract.md docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md
git commit -m "docs(workflow): lock invoke around facts, slots, and lineage"
```

---

### Task 5: Run focused verification and record any remaining follow-up

**Files:**
- Modify: `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md` (only if verification reveals drift worth recording)

**Step 1: Run focused tests**

Run: `bunx vitest run "packages/methodology-engine/src/validation.test.ts" "packages/scripts/src/__tests__/methodology-seed-integrity.test.ts" "packages/workflow-engine/src/invoke.test.ts"`
Expected: PASS

**Step 2: Run typecheck for touched packages if available**

Run: `bun run check-types`
Expected: PASS, or a short list of unrelated pre-existing failures documented before stopping

**Step 3: Record any narrow follow-up if needed**

If verification exposes a remaining conflict (for example another canonical doc still mentions `bindingMode`), add a short note to `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md` under implementation notes rather than expanding scope mid-task.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md
git commit -m "chore(workflow): record invoke verification follow-up"
```

Only create this commit if Step 3 changed the design doc.
