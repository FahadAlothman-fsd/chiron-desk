# Implementation Plan: Story 1.2

**Story:** Define Work Unit Types and Transition Lifecycle Rules in Methodology Draft
**Status:** ready-for-dev → in-progress
**Created:** 2026-02-24

---

## Clarifications Resolved

Based on codebase analysis of Story 1.1 patterns, the following clarifications are resolved:

### 1. DB Table Contract

**New Tables:**

| Table | Columns | Indexes |
|-------|---------|---------|
| `methodology_work_unit_types` | id, vid (FK), key, displayName, descriptionJson, cardinality, createdAt | unique(vid, key) |
| `methodology_lifecycle_states` | id, vid (FK), workUnitTypeId (FK), key, displayName, descriptionJson, createdAt | unique(vid, workUnitTypeId, key), index(vid, workUnitTypeId) |
| `methodology_lifecycle_transitions` | id, vid (FK), workUnitTypeId (FK), fromStateId (NULL FK), toStateId (FK), transitionKey, gateClass, createdAt | unique(vid, workUnitTypeId, transitionKey), index(vid, workUnitTypeId), index(fromStateId), index(toStateId) |
| `methodology_fact_schemas` | id, vid (FK), workUnitTypeId (FK), key, factType, required, defaultValueJson, createdAt | unique(vid, workUnitTypeId, key), index(vid, workUnitTypeId) |
| `methodology_transition_required_links` | id, vid (FK), transitionId (FK), linkTypeKey, strength, required, createdAt | unique(vid, transitionId, linkTypeKey), index(vid, transitionId) |

### 2. API Surface Contract

**New Procedures:**
- `updateDraftLifecycle`: orchestrates lifecycle definition updates within draft version scope
  - Input: `{ versionId, workUnitTypes, lifecycleStates, lifecycleTransitions, factSchemas, transitionRequiredLinks }`
  - Output: `{ version, events, validation }`

**Reuse:** `getVersion`, `getVersionEvents` remain for read operations

### 3. Eligibility Response Schema

```typescript
{
  workUnitTypeKey: string;
  currentState: string | "__absent__";
  eligibleTransitions: Array<{
    transitionKey: string;
    fromState: string | "__absent__";
    toState: string;
    gateClass: "start_gate" | "completion_gate";
    requiredLinks: Array<{
      linkTypeKey: string;
      strength: "hard" | "soft" | "context";
      required: boolean;
    }>;
  }>;
}
```

**Sort order:** by workUnitTypeKey, then fromState, then transitionKey

### 4. Evidence Event Types

| Event Type | Description |
|------------|-------------|
| `lifecycle_created` | Initial lifecycle definition saved |
| `lifecycle_updated` | Lifecycle definition modified |
| `lifecycle_validated` | Validation completed (pass or fail) |
| `lifecycle_query` | Eligibility metadata queried |

---

## Implementation Steps

### Step 1: Contracts & Schemas (packages/contracts)

**Files to Create:**
1. `packages/contracts/src/methodology/lifecycle.ts` - Lifecycle types (states, transitions, gate classes)
2. `packages/contracts/src/methodology/fact.ts` - Fact schema types
3. `packages/contracts/src/methodology/dependency.ts` - Dependency link requirement types
4. `packages/contracts/src/methodology/eligibility.ts` - Eligibility query types
5. `packages/contracts/src/methodology/index.ts` - Exports

**Key Types:**
- `WorkUnitTypeDefinition`, `LifecycleState`, `LifecycleTransition`, `FactSchema`, `TransitionRequiredLink`
- `GateClass: "start_gate" | "completion_gate"`
- `CardinalityPolicy: "one_per_project" | "many_per_project"`
- `FactType: "string" | "number" | "boolean" | "json"`
- `DependencyStrength: "hard" | "soft" | "context"`
- `TransitionEligibilityResponse`

**Estimates:**
- Complexity: medium
- Time: 2-3 hours
- Risks: Type definition complexity with all the allowed sets

### Step 2: DB Schema Extensions (packages/db)

**File to Edit:**
- `packages/db/src/schema/methodology.ts`

**Add:**
- 5 new tables as defined in Clarification #1
- Foreign key relationships to `methodologyVersions`
- Indexes for query patterns

**Estimates:**
- Complexity: medium
- Time: 1-2 hours
- Risks: FK relationships and cascade delete

### Step 3: Validation Rules (packages/methodology-engine)

**Files to Create:**
- `packages/methodology-engine/src/lifecycle-validation.ts` - Pure validation functions

**Validation Functions:**
1. `validateLifecycleDefinition` - AC 5: duplicate state IDs, undefined refs, duplicate transition keys
2. `validateCardinality` - AC 6: only allowed values
3. `validateFactSchemas` - AC 7: duplicate keys, unsupported types, invalid defaults, reserved collisions
4. `validateDependencyRequirements` - AC 8: undefined link types, disallowed strengths
5. `validateGateClasses` - AC 9: only allowed values
6. `validateAbsentTransitions` - AC 10: one-way only (from NULL to defined, NOT reverse)

**Estimates:**
- Complexity: high
- Time: 4-5 hours
- Risks: Deterministic sorting requirements, AC coverage completeness

### Step 4: Repository Extensions (packages/methodology-engine)

**Files to Edit:**
- `packages/methodology-engine/src/repository.ts` - Add lifecycle repository interface and methods

**Add Interface Methods:**
- `findWorkUnitTypes(versionId: string): Effect<WorkUnitTypeRow[]>`
- `findLifecycleStates(versionId: string, workUnitTypeId?: string): Effect<LifecycleStateRow[]>`
- `findLifecycleTransitions(versionId: string, workUnitTypeId?: string, fromStateId?: string | null): Effect<LifecycleTransitionRow[]>`
- `findFactSchemas(versionId: string, workUnitTypeId?: string): Effect<FactSchemaRow[]>`
- `findTransitionRequiredLinks(versionId: string, transitionId?: string): Effect<TransitionRequiredLinkRow[]>`
- `saveLifecycleDefinition(params: SaveLifecycleParams): Effect<{ version, events }>` - transactional

**Estimates:**
- Complexity: medium
- Time: 2-3 hours
- Risks: Transactional consistency, FK handling for NULL from_state_id

### Step 5: Service Layer (packages/methodology-engine)

**Files to Create:**
- `packages/methodology-engine/src/lifecycle-service.ts` - Core lifecycle domain service
- `packages/methodology-engine/src/eligibility-service.ts` - Eligibility query service

**Lifecycle Service:**
- `updateDraftLifecycle(input, actorId)` - AC 1: create/update lifecycle in draft scope
- Pure validation → check valid → if invalid return zero writes with diagnostics
- If valid → transactional save with evidence events

**Eligibility Service:**
- `getTransitionEligibility(versionId, workUnitTypeKey, currentStateKey)` - AC 11: return deterministic metadata
- Query transitions by from_state_id (NULL = absent, defined = match)
- Include guard metadata (required links, gate class)

**Estimates:**
- Complexity: high
- Time: 4-5 hours
- Risks: Effect composition, error handling, evidence event emission

### Step 6: API Procedures (packages/api)

**File to Edit:**
- `packages/api/src/routers/methodology.ts`

**Add Procedures:**
1. `updateDraftLifecycle` (protectedProcedure)
   - Input validation with zod
   - Call lifecycle service
   - Map Effect errors to HTTP status codes

2. `getTransitionEligibility` (publicProcedure)
   - Query eligibility metadata
   - Return deterministic response

**Estimates:**
- Complexity: medium
- Time: 2-3 hours
- Risks: Error mapping, serialization

### Step 7: Wire Everything (packages/api)

**File to Edit:**
- `packages/api/src/index.ts` - Update Layer composition to include new services

**Add:**
- `LifecycleServiceLive` to service layer
- `EligibilityServiceLive` to service layer

**Estimates:**
- Complexity: low
- Time: 30 mins
- Risks: Layer composition order

### Step 8: Tests (all packages)

**Files to Create:**
1. `packages/contracts/src/methodology/lifecycle.test.ts` - Type/schema tests
2. `packages/methodology-engine/src/lifecycle-validation.test.ts` - Deterministic validation tests
3. `packages/methodology-engine/src/lifecycle-service.test.ts` - Service behavior tests
4. `packages/methodology-engine/src/eligibility-service.test.ts` - Eligibility query tests
5. `packages/db/src/schema/methodology.test.ts` - Schema integrity tests
6. `packages/api/src/routers/methodology-lifecycle.test.ts` - API integration tests

**Test Coverage Required:**
- All AC rejection cases (duplicates, undefined refs, invalid values, __absent__ direction)
- Valid lifecycle creation/update
- Eligibility metadata determinism
- Evidence event emission
- Transactional no-partial-mutation behavior
- Story 1.1 regression tests (auth, actor propagation, diagnostics ordering)

**Estimates:**
- Complexity: high
- Time: 6-8 hours
- Risks: Comprehensive coverage, determinism verification

---

## Total Estimates

| Phase | Time | Complexity |
|-------|------|------------|
| Step 1: Contracts | 2-3 hrs | medium |
| Step 2: DB Schema | 1-2 hrs | medium |
| Step 3: Validation | 4-5 hrs | high |
| Step 4: Repository | 2-3 hrs | medium |
| Step 5: Service Layer | 4-5 hrs | high |
| Step 6: API Procedures | 2-3 hrs | medium |
| Step 7: Wiring | 0.5 hrs | low |
| Step 8: Tests | 6-8 hrs | high |
| **Total** | **22-29 hrs** | **high** |

---

## Verification Criteria

Before marking complete:

- [ ] All 12 ACs have corresponding test coverage
- [ ] Deterministic behavior verified (same input = same diagnostics order, same eligibility output)
- [ ] No partial mutation on invalid input (all tests prove atomicity)
- [ ] Evidence events emit and are queryable via lineage
- [ ] Story 1.1 regression tests pass (auth writes, actor propagation, diagnostics ordering)
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`)

---

## Dev Agent Checkpoint Questions

### Step 1 Completion:
1. Are all allowed sets defined as literal unions? (cardinality, gateClass, factType, strength)
2. Do types support __absent__ as pseudo-state in contracts?
3. Are eligibility response types defined with deterministic sort order in mind?

### Step 2 Completion:
1. Do new tables follow existing naming conventions?
2. Are FKs set with cascade delete?
3. Are indexes defined for query patterns?
4. Is from_state_id nullable for __absent__ activation edges?

### Step 3 Completion:
1. Are all 12 ACs covered in validation?
2. Is diagnostics sorting deterministic (scope then code)?
3. Are all rejection cases tested with negative tests?
4. Is __absent__ directionality enforced?

### Step 4 Completion:
1. Are repository methods transactional?
2. Do methods handle NULL from_state_id correctly?
3. Is evidence event emission included?

### Step 5 Completion:
1. Does service validate before persisting?
2. Is zero-write behavior on invalid input?
3. Is actorId propagated to evidence?
4. Are eligibility queries deterministic?

### Step 6 Completion:
1. Are writes protected (auth required)?
2. Are error mappings comprehensive?
3. Is input validation at boundary?

### Step 7 Completion:
1. Is service layer composition correct?
2. Do all dependencies resolve?

### Step 8 Completion:
1. Are all ACs tested (positive and negative paths)?
2. Are determinism tests explicit?
3. Are transactional tests proving no partial mutation?
4. Do regression tests for 1.1 pass?

---

## References

- Story: `_bmad-output/implementation-artifacts/1-2-define-work-unit-types-and-transition-lifecycle-rules-in-methodology-draft.md`
- Sprint Status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story 1.1: `_bmad-output/implementation-artifacts/1-1-create-methodology-draft-baseline.md`
