# Contextual In-App Surveys Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a DB-first in-app survey engine with trigger rules + participant segmentation, capturing exposures separately from responses and providing a minimal export/analytics surface for thesis-grade evaluation.

**Architecture:** Persist events + survey entities in SQLite (Drizzle). Run a deterministic scheduler (Effect service) that evaluates versioned trigger rules against observability events and writes `survey_exposure` rows. UI only displays pending exposures and writes `survey_response` linked to `survey_exposure`.

**Tech Stack:** TypeScript, Effect, Drizzle ORM (SQLite/libsql), Zod, Vitest, TanStack Router (UI), oRPC/Hono (API) as needed.

---

### Task 1: Add survey contracts (schemas + types)

**Files:**
- Create: `packages/contracts/src/observability/survey.ts`
- Create: `packages/contracts/src/observability/index.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/observability/survey.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { SurveyTriggerRuleSchema } from "./survey";

describe("SurveyTriggerRuleSchema", () => {
  test("rejects invalid sampleRate", () => {
    const result = SurveyTriggerRuleSchema.safeParse({
      id: "r1",
      surveyDefinitionId: "s1",
      ruleVersion: 1,
      isEnabled: true,
      priority: 100,
      eventType: "execution.completed",
      predicate: {},
      segmentFilter: {},
      delayMs: 60_000,
      jitterMs: 30_000,
      sampleRate: 2,
      cooldownMs: 86_400_000,
      maxPerDay: 1,
      maxPerStudy: 10,
      stopOnResponse: true,
    });

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/contracts`
Expected: FAIL (module/file not found or schema not exported).

**Step 3: Write minimal implementation**

```ts
import { z } from "zod";

export const SurveyId = z.string().min(1);
export const SurveyRuleId = z.string().min(1);
export const SurveyType = z.string().min(1);

export const SurveyTriggerRuleSchema = z.object({
  id: SurveyRuleId,
  surveyDefinitionId: SurveyId,
  ruleVersion: z.number().int().positive(),
  isEnabled: z.boolean(),
  priority: z.number().int(),
  eventType: z.string().min(1),
  predicate: z.record(z.unknown()),
  segmentFilter: z.record(z.unknown()),
  delayMs: z.number().int().nonnegative(),
  jitterMs: z.number().int().nonnegative(),
  sampleRate: z.number().min(0).max(1),
  cooldownMs: z.number().int().nonnegative(),
  maxPerDay: z.number().int().positive(),
  maxPerStudy: z.number().int().positive(),
  stopOnResponse: z.boolean(),
});
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/contracts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/observability packages/contracts/src/index.ts
git commit -m "feat(contracts): add contextual survey schemas"
```

---

### Task 2: Add DB schema for surveys (definitions, rules, exposures, responses)

**Files:**
- Create: `packages/db/src/schema/observability.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema/observability.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { surveyExposures } from "./observability";

describe("surveyExposures schema", () => {
  test("has required columns", () => {
    expect(surveyExposures.id.name).toBe("id");
    expect(surveyExposures.participantId.name).toBe("participant_id");
    expect(surveyExposures.status.name).toBe("status");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/db`
Expected: FAIL (file/table not found).

**Step 3: Write minimal implementation**

Create `packages/db/src/schema/observability.ts` with SQLite tables:
- `participants`
- `participant_consents`
- `cohort_assignments`
- `survey_definitions`
- `survey_trigger_rules`
- `survey_exposures`
- `survey_responses`

Minimum required properties:
- `survey_exposures` includes `trigger_event_id`, `offered_at`, `shown_at`, `status`, `suppression_reason`, `response_id` and context foreign keys (`project_id`, `execution_id`, `step_id`, `tool_call_id`).
- Indexes:
  - exposures by `(participant_id, offered_at)`
  - exposures by `(survey_definition_id, rule_id, offered_at)`
  - responses by `(participant_id, submitted_at)`

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/db`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/db/src/schema
git commit -m "feat(db): add tables for survey exposures and responses"
```

---

### Task 3: Add DB repository layer for survey operations (Effect)

**Files:**
- Create: `packages/db/src/observability-repository.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/src/observability-repository.integration.test.ts`

**Step 1: Write the failing integration test**

```ts
import { describe, expect, test } from "vitest";
import { Effect } from "effect";
import { db } from "./index";
import { createObservabilityRepoLayer, ObservabilityRepository } from "./observability-repository";

describe("ObservabilityRepository", () => {
  test("creates an exposure and reads it back", async () => {
    const program = ObservabilityRepository.pipe(
      Effect.flatMap((repo) =>
        repo.createExposure({
          participantId: "p1",
          surveyDefinitionId: "s1",
          ruleId: "r1",
          triggerEventId: "e1",
          uiSurface: "toast",
        }),
      ),
      Effect.flatMap((created) =>
        ObservabilityRepository.pipe(
          Effect.flatMap((repo) => repo.listPendingExposures({ participantId: "p1" })),
          Effect.map((pending) => ({ created, pending })),
        ),
      ),
    );

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(createObservabilityRepoLayer(db))),
    );

    expect(result.pending.some((e) => e.id === result.created.id)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/db`
Expected: FAIL (repository/tag not implemented).

**Step 3: Write minimal implementation**

Implement `ObservabilityRepository` as an Effect service tag with operations:
- `createExposure(input)`
- `markExposureShown(exposureId, shownAt)`
- `markExposureOutcome(exposureId, status, suppressionReason?)`
- `writeResponse(input)` (links `exposureId` -> `survey_response.id` and updates exposure)
- `listPendingExposures({ participantId, now })`

Use the established DB wrapping pattern from `docs/architecture/decisions/adr-effect-sqlite.md`:
- `Effect.tryPromise({ try, catch: (cause) => new RepositoryError({ operation, cause }) })`

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/db`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/db/src/observability-repository.ts packages/db/src/index.ts packages/db/src/schema/observability.ts
git commit -m "feat(db): add observability repo for survey persistence"
```

---

### Task 4: Implement trigger-rule evaluation (pure functions + deterministic sampling)

**Files:**
- Create: `packages/contracts/src/observability/rules.ts`
- Create: `packages/observability/src/rule-engine.ts`
- Test: `packages/observability/src/rule-engine.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { shouldOfferSurvey } from "./rule-engine";

describe("shouldOfferSurvey", () => {
  test("respects cooldown", () => {
    const result = shouldOfferSurvey({
      nowMs: 10_000,
      lastOfferedAtMs: 9_999,
      cooldownMs: 60_000,
      sampleRate: 1,
      deterministicKey: "p1:r1:e1",
      predicateMatch: true,
    });

    expect(result.decision).toBe("suppress");
    expect(result.reason).toBe("cooldown");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/observability`
Expected: FAIL (package/files not present).

**Step 3: Write minimal implementation**

- Make sampling deterministic by hashing `deterministicKey` (e.g., FNV-1a) to a float in [0,1).
- Implement decision order:
  1) consent/segment (handled by caller)
  2) predicate match
  3) cooldown/quotas
  4) deterministic sampling

Return a discriminated union `{ decision: "offer" | "suppress"; reason?: ... }`.

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/observability`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/observability/rules.ts packages/observability/src
git commit -m "feat(observability): add deterministic survey rule engine"
```

---

### Task 5: Wire scheduler (consume events -> create exposures)

**Files:**
- Create: `packages/observability/src/survey-scheduler.ts`
- Test: `packages/observability/src/survey-scheduler.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { evaluateEventForExposures } from "./survey-scheduler";

describe("evaluateEventForExposures", () => {
  test("offers a survey when predicate matches and budgets allow", () => {
    const exposures = evaluateEventForExposures({
      event: { id: "e1", type: "execution.completed", atMs: 1_000 },
      participant: { id: "p1", cohortKey: "control" },
      rules: [
        {
          id: "r1",
          surveyDefinitionId: "s1",
          ruleVersion: 1,
          isEnabled: true,
          priority: 100,
          eventType: "execution.completed",
          predicate: {},
          segmentFilter: {},
          delayMs: 60_000,
          jitterMs: 0,
          sampleRate: 1,
          cooldownMs: 0,
          maxPerDay: 10,
          maxPerStudy: 100,
          stopOnResponse: false,
        },
      ],
      state: { lastOfferedAtByRule: {}, offeredToday: 0, offeredTotal: 0 },
    });

    expect(exposures).toHaveLength(1);
    expect(exposures[0]?.surveyDefinitionId).toBe("s1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/observability`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Implement a pure function that:
  - selects candidate rules by `eventType`
  - orders by `priority`
  - applies `segmentFilter`
  - uses `shouldOfferSurvey` to enforce cooldown/quotas/sampling
  - returns `survey_exposure` payloads with `showAfter` = `event.at + delay + jitter`

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/observability`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/observability/src/survey-scheduler.ts packages/observability/src/survey-scheduler.test.ts
git commit -m "feat(observability): add survey scheduler logic"
```

---

### Task 6: UI prompt surface (pending exposure queue -> response write)

**Files:**
- Create: `apps/web/src/features/observability/survey-prompt.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Test: `apps/web/src/features/observability/survey-prompt.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SurveyPrompt } from "./survey-prompt";

describe("SurveyPrompt", () => {
  test("renders a pending exposure", () => {
    render(
      <SurveyPrompt
        pending={[{ id: "x1", title: "Quick check-in", surveyType: "post-exec" }]}
      />,
    );

    expect(screen.getByText("Quick check-in")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F web`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Render a non-blocking UI (toast/drawer) that supports:
  - `Dismiss` (writes exposure outcome)
  - `Snooze` (updates `showAfter`)
  - `Answer` (writes `survey_response` and marks exposure answered)

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F web`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/observability apps/web/src/components/app-shell.tsx
git commit -m "feat(web): add in-app survey prompt surface"
```

---

### Task 7: Minimum analytics + export

**Files:**
- Create: `packages/db/src/observability-queries.ts`
- Create: `packages/scripts/src/export-survey-data.ts`
- Test: `packages/db/src/observability-queries.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { computeExposureFunnel } from "./observability-queries";

describe("computeExposureFunnel", () => {
  test("computes shown/answered counts", () => {
    const funnel = computeExposureFunnel([
      { status: "offered" },
      { status: "shown" },
      { status: "answered" },
    ] as any);

    expect(funnel.offered).toBe(1);
    expect(funnel.shown).toBe(1);
    expect(funnel.answered).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- -F @chiron/db`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Provide:
  - `computeExposureFunnel(exposures)`
  - `responseRate = answered / shown`
  - export script that writes CSV/JSON including:
    - `participantId` (pseudonymous)
    - `cohortKey`
    - `surveyType`, `schemaVersion`, `ruleVersion`, `appVersion`, `consentVersion`
    - exposure timestamps + status
    - response values + `durationMs`
  - Default: exclude free-text unless `freeTextExport` consent exists.

**Step 4: Run test to verify it passes**

Run: `bun run test -- -F @chiron/db`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/db/src/observability-queries.ts packages/scripts/src/export-survey-data.ts
git commit -m "feat(observability): add minimal survey analytics and export"
```

---

## Verification checklist (before claiming results)

- Run: `bun run check-types`
- Run: `bun run test`
- Run: `bun run db:push`
- Manual: trigger a synthetic event and verify:
  - exposure created
  - UI shows prompt after delay
  - dismiss/snooze recorded
  - response linked to exposure
  - export contains exposures + responses + versions
