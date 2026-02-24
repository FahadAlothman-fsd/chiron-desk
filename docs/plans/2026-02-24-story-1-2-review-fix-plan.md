# Story 1.2 Review Fix + Agent Types Implementation Plan

## Work Breakdown

### Wave 1: Bug Fixes (10 issues, independent)

**1a. CRITICAL — Remove definitionJson overwrite in saveLifecycleDefinition**
- File: `packages/db/src/lifecycle-repository.ts`
- Action: Remove lines 333-344 that write `{ workUnitTypes }` to `definitionJson`
- The relational tables ARE the source of truth. Don't touch definitionJson.

**1b. CRITICAL — Fix unsafe cast on definitionJson**
- File: `packages/methodology-engine/src/lifecycle-service.ts:108`
- Action: Use Schema.decode or safe parsing instead of `as { workUnitTypes: ... }`

**1c. HIGH — Fix silent data loss on missing toStateId**
- File: `packages/db/src/lifecycle-repository.ts:302`
- Action: Replace `if (!toStateId) continue;` with `throw`

**1d. HIGH — Fix broken test imports**
- File: `packages/methodology-engine/src/lifecycle-validation.test.ts:4-6`
- Action: Remove non-existent imports (validateCardinality, validateGateClass, validateAbsentTransitions)

**1e. HIGH — Fix N+1 query in eligibility service**
- File: `packages/methodology-engine/src/eligibility-service.ts:76-81`
- Action: Batch-fetch all required links, then filter in-memory

**1f. HIGH — Change actorId to non-nullable**
- File: `packages/methodology-engine/src/lifecycle-service.ts:32`
- Action: Change `actorId: string | null` to `actorId: string`

**1g. MEDIUM — Fix unsafe casts + silent fallback in eligibility**
- File: `packages/methodology-engine/src/eligibility-service.ts:87-92`
- Action: Add explicit validation or throw on unknown values

**1h. MEDIUM — Replace non-null assertions with explicit checks**
- File: `packages/db/src/lifecycle-repository.ts:254,292,316`
- Action: Add null checks with descriptive error messages

**1i. LOW — Remove unused imports**
- File: `packages/methodology-engine/src/lifecycle-service.ts:1-10`
- Action: Remove unused type imports

### Wave 2: Agent Type Implementation

**2a. Contracts — agent.ts**
- New file: `packages/contracts/src/methodology/agent.ts`
- Define: ModelReference, AgentTypeDefinition schemas
- Update: `packages/contracts/src/methodology/index.ts` re-exports

**2b. DB Table — methodology_agent_types**
- File: `packages/db/src/schema/methodology.ts`
- Add: methodologyAgentTypes table following existing pattern

**2c. Update MethodologyVersionDefinition**
- File: `packages/contracts/src/methodology/version.ts`
- Add: `agentTypes: Schema.Array(Schema.Unknown)` field

**2d. Validation — agent validation rules**
- File: `packages/methodology-engine/src/lifecycle-validation.ts`
- Add: validateAgentTypes function (duplicate keys, empty key, empty persona, reserved keys, invalid model ref)

**2e. Repository — agent CRUD in lifecycle-repository**
- Files: `packages/methodology-engine/src/lifecycle-repository.ts` (interface) + `packages/db/src/lifecycle-repository.ts` (impl)
- Add: findAgentTypes, save agent types in transaction

**2f. Service — extend lifecycle-service for agent types**
- File: `packages/methodology-engine/src/lifecycle-service.ts`
- Extend: updateDraftLifecycle to accept and save agentTypes

**2g. API — extend procedure input**
- File: `packages/api/src/routers/methodology.ts`
- Extend: updateDraftLifecycle Zod schema + procedure to handle agentTypes

### Wave 3: Tests + Verification

**3a. Add agent type validation tests**
**3b. Update existing mocks with agent type support**
**3c. Run full test suite — 87+ pass, 0 fail**
