# Granular Methods and Operations at Design Time - Investigation Report

## Executive Summary

The current methodology engine architecture forces **full lifecycle validation** for simple metadata operations (create/update/delete agents, work units). This is inefficient and causes cascading validation failures. This document outlines the current state, identifies gaps, and provides recommendations for implementing proper granular CRUD operations.

## Current Architecture Problem

### The Issue
When updating a single work unit's description or display name, the system:
1. Loads the **entire lifecycle definition** (all work units, facts, states, transitions)
2. Runs **full validation** on everything
3. Re-saves the **entire snapshot**

This means editing "Setup" work unit metadata triggers validation of Brainstorming's facts, Research's transitions, etc.

### Procedures Using Full Lifecycle Validation

| Procedure | Location | Current Path | Problem |
|-----------|----------|--------------|---------|
| `createAgent` | `methodology-version-service.ts:795` | `updateDraftLifecycle` | Validates all work units, facts, states |
| `updateAgent` | `methodology-version-service.ts:835` | `updateDraftLifecycle` | Validates all work units, facts, states |
| `deleteAgent` | `methodology-version-service.ts:935` | `updateDraftLifecycle` | Validates all work units, facts, states |
| `createWorkUnit` | `methodology-version-service.ts:864` | `updateDraftLifecycle` | Validates all agents, other work units |
| `updateWorkUnit` | `methodology-version-service.ts:895` | `updateDraftLifecycle` | Validates all agents, other work units |

### Call Chain
```
API Router
  → MethodologyVersionBoundaryService.createAgent/updateAgent/deleteAgent
    → methodology-version-service.ts:createAgent/updateAgent/deleteAgent
      → loadPreviousLifecycleDefinition()
      → updateDraftLifecycle()
        → validateLifecycleDefinition()  ← VALIDATES EVERYTHING
        → LifecycleRepository.saveLifecycleDefinition()  ← REWRITES EVERYTHING
```

## Entity CRUD Status

### Full CRUD Required (Create, Read, Update, Delete, List, Get Single)

| Entity | Parent | Create | Read (List) | Read (Get Single) | Update | Delete | Implementation |
|--------|--------|--------|-------------|-------------------|--------|--------|----------------|
| **Work Units** | Methodology Version | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Full lifecycle (WRONG) |
| **Agents** | Methodology Version | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Full lifecycle (WRONG) |
| **Facts (methodology-level)** | Methodology Version | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Full draft rewrite |
| **Facts (work-unit-level)** | Work Unit | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Replace-all pattern |
| **States** | Work Unit | ✅ (upsert) | ✅ | ❌ MISSING | ✅ (upsert) | ✅ | Granular ✅ |
| **Transitions** | Work Unit | ✅ (upsert) | ✅ | ❌ MISSING | ✅ (upsert) | ✅ | Granular ✅ |
| **Workflows** | Work Unit | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Granular ✅ |
| **Artifact Slots** | Work Unit | ✅ | ✅ | ❌ MISSING | ✅ | ✅ | Replace-all pattern |

### Key Gaps
1. **Get-single endpoints missing** for ALL entities
2. **Inconsistent mutation strategies**:
   - Work units/agents: lifecycle snapshot path (WRONG)
   - Workflows/states/transitions: granular repo mutations (CORRECT)
   - Artifact slots/work-unit facts: replace-all patterns (ACCEPTABLE)

## Child Entities (Delta Changes)

**Correction**: Child entities do NOT use full replace-all - they use **delta/diff changes**:

| Entity | Parent | Pattern | Notes |
|--------|--------|---------|-------|
| **Bindings** | Transition | Delta changes | Add/remove individual bindings |
| **Condition Sets** | Transition | Delta changes | Two types: `start` and `completion` per transition |
| **Artifact Templates** | Artifact Slot | Delta changes | Add/remove/update individual templates |

### Condition Sets Design Recommendation

Condition sets are currently replace-only. Better design:
- **DB-level enum**: `type` field with values `['start', 'completion']`
- **Uniqueness constraint**: One `start` and one `completion` per transition
- **Upsert operation**: By `(transitionId, type)` composite key

This would simplify the API and enforce data integrity at the database level.

## Repository Layer Analysis

### Granular Methods That Exist (But Aren't Used for Agents/Work Units)

```typescript
// MethodologyRepository has these granular methods:
- deleteWorkUnitType(versionId, workUnitTypeKey)  // ✅ Used correctly
- replaceWorkUnitFacts(versionId, workUnitTypeKey, facts)  // ✅ Used correctly
- upsertWorkUnitLifecycleState(...)  // ✅ Used correctly
- deleteWorkUnitLifecycleState(...)  // ✅ Used correctly
- upsertWorkUnitLifecycleTransition(...)  // ✅ Used correctly
- deleteWorkUnitLifecycleTransition(...)  // ✅ Used correctly
- replaceWorkUnitTransitionConditionSets(...)  // ✅ Used correctly
- createWorkflow(...)  // ✅ Used correctly
- updateWorkflow(...)  // ✅ Used correctly
- deleteWorkflow(...)  // ✅ Used correctly
- replaceArtifactSlotsForWorkUnitType(...)  // ✅ Used correctly

// MISSING - needed for proper granular operations:
- createAgent(...)  // ❌ MISSING
- updateAgent(...)  // ❌ MISSING
- deleteAgent(...)  // ❌ MISSING (exists in boundary but uses lifecycle path)
- createWorkUnitType(...)  // ❌ MISSING
- updateWorkUnitTypeMetadata(...)  // ❌ MISSING
- getAgentByKey(...)  // ❌ MISSING (for get-single)
- getWorkUnitTypeByKey(...)  // ❌ MISSING (for get-single)
```

## Recommended Architecture Changes

### Phase 1: Fix Immediate Pain (Data Issues)
- ✅ COMPLETED: Fixed `project_kind` fact validation (changed from `json-schema` to `allowed-values`)
- Need to fix remaining 3 facts with same issue:
  - `research_report_path`
  - `research_sources_directory`
  - `research_output_language`

### Phase 2: Add Granular Repository Methods

**For Agents:**
```typescript
// MethodologyRepository additions:
- createAgent(versionId, agent): Promise<Agent>
- updateAgent(versionId, agentKey, agent): Promise<Agent>
- deleteAgent(versionId, agentKey): Promise<void>
- getAgentByKey(versionId, agentKey): Promise<Agent | null>
- listAgents(versionId): Promise<Agent[]>
```

**For Work Units:**
```typescript
// MethodologyRepository additions:
- createWorkUnitType(versionId, workUnit): Promise<WorkUnitType>
- updateWorkUnitTypeMetadata(versionId, workUnitKey, metadata): Promise<WorkUnitType>
- deleteWorkUnitType(versionId, workUnitKey): Promise<void>  // Already exists
- getWorkUnitTypeByKey(versionId, workUnitKey): Promise<WorkUnitType | null>
- listWorkUnitTypes(versionId): Promise<WorkUnitType[]>
```

### Phase 3: Refactor Service Layer

**Current (WRONG):**
```typescript
// methodology-version-service.ts
const updateWorkUnit = (input, actorId) =>
  Effect.gen(function* () {
    const previous = yield* loadPreviousLifecycleDefinition(...);
    const nextWorkUnits = previous.workUnitTypes.map(wut =>
      wut.key === input.workUnitKey ? { ...wut, ...input } : wut
    );
    return yield* updateDraftLifecycle({  // ← WRONG: validates everything
      versionId: input.versionId,
      workUnitTypes: nextWorkUnits,
      agentTypes: previous.agentTypes,
    }, actorId);
  });
```

**Target (CORRECT):**
```typescript
// methodology-version-service.ts
const updateWorkUnitMetadata = (input, actorId) =>
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
    
    // 1. Validate version is draft
    const version = yield* repo.findVersionById(input.versionId);
    yield* ensureVersionIsDraft(version);
    
    // 2. Validate work unit exists
    const existing = yield* repo.getWorkUnitTypeByKey(
      input.versionId, 
      input.workUnitKey
    );
    if (!existing) return yield* new WorkUnitNotFoundError(...);
    
    // 3. Validate key uniqueness (if key changed)
    if (input.key && input.key !== input.workUnitKey) {
      const duplicate = yield* repo.getWorkUnitTypeByKey(input.versionId, input.key);
      if (duplicate) return yield* new DuplicateKeyError(...);
    }
    
    // 4. Update ONLY the metadata fields
    const updated = yield* repo.updateWorkUnitTypeMetadata(
      input.versionId,
      input.workUnitKey,
      {
        key: input.key,
        displayName: input.displayName,
        description: input.description,
        cardinality: input.cardinality,
      }
    );
    
    // 5. Record targeted event (not full lifecycle event)
    yield* repo.recordEvent({
      versionId: input.versionId,
      type: "WORK_UNIT_METADATA_UPDATED",
      payload: { workUnitKey: input.workUnitKey, fields: Object.keys(input) },
      actorId,
    });
    
    return updated;
  });
```

### Phase 4: Add Get-Single Endpoints

All entities need get-by-key endpoints:

```typescript
// API Router additions:
- version.workUnit.get({ versionId, workUnitKey })
- version.agent.get({ versionId, agentKey })
- version.fact.get({ versionId, factKey })
- version.workUnit.fact.get({ versionId, workUnitKey, factKey })
- version.workUnit.stateMachine.state.get({ versionId, workUnitKey, stateKey })
- version.workUnit.stateMachine.transition.get({ versionId, workUnitKey, transitionKey })
- version.workUnit.workflow.get({ versionId, workUnitKey, workflowKey })
- version.workUnit.artifactSlot.get({ versionId, workUnitKey, slotKey })
```

## Services Architecture Review

### Current Service Layer

| Service | File | Responsibility | Issue |
|---------|------|----------------|-------|
| `MethodologyVersionBoundaryService` | `methodology-version-service.ts` | Main L1 boundary | Forces full lifecycle for agent/WU ops |
| `WorkUnitService` | `work-unit-service.ts` | Interface only | Implementation in boundary service |
| `WorkflowService` | `workflow-service.ts` | Workflow CRUD | ✅ Correct: granular + post-validate |
| `WorkUnitStateMachineService` | `work-unit-state-machine-service.ts` | States/transitions | ✅ Correct: granular ops |
| `WorkUnitFactService` | `work-unit-fact-service.ts` | WU facts | ❌ Wrong: uses full lifecycle |
| `WorkUnitArtifactSlotService` | `work-unit-artifact-slot-service.ts` | Artifact slots | ⚠️ Replace-all pattern |

### Missing Services

- **AgentService** - Does not exist, agents handled in boundary service

## Effect Pattern Notes

Services use `Layer.effect` with `Effect.gen`, dependencies via `yield*`. Pattern is correct, but wrong methods are being called at the boundary layer.

## Files Modified in Recent Fixes

1. `packages/api/src/routers/methodology.ts` - Added `allowed-values` validation, fixed diagnostic parsing
2. `packages/contracts/src/methodology/dto.ts` - Added `AllowedValuesValidationConfig` to union
3. `packages/methodology-engine/src/lifecycle-validation.ts` - Added `allowed-values` validation logic
4. `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Fixed `project_kind` fact

## Next Steps

1. **Immediate**: Fix remaining 3 facts with `json-schema` + `factType: "string"` combination
2. **Short-term**: Add granular repository methods for agents and work units
3. **Medium-term**: Refactor service layer to use granular methods
4. **Long-term**: Add get-single endpoints for all entities

## Conclusion

The current architecture forces full lifecycle validation for simple metadata operations, which is inefficient and causes unnecessary coupling. The repository layer already has granular methods for most entities - we need to:
1. Add missing granular methods for agents and work units
2. Refactor the service layer to use these methods
3. Add get-single endpoints for all entities

This will decouple metadata operations from lifecycle validation and improve performance and maintainability.
