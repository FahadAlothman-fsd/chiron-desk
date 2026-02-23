# Chiron Effect Schema Contract Status (Week 6)

Date: 2026-02-18
Status: Implemented baseline

## Implemented

- Added strict JSON contract module:
  - `packages/contracts/src/methodology-schemas.ts`
- Exported contract module through:
  - `packages/contracts/src/index.ts`

## What Is Now Enforced

1. Recursive JSON value safety (`JsonValueSchema`) instead of raw unknown for core payloads.
2. Start/completion gate requirement schemas.
3. Transition binding defaults schema.
4. Workflow definition schema with six-step union (`form`, `agent`, `action`, `invoke`, `branch`, `display`).
5. Invoke methodology extensions (`bindingMode`, child-work-unit fields, child outcome policy).
6. Gate finding/summary schemas.
7. Slot artifact/snapshot schemas.
8. Variables, approvals, templates, optimization payload schemas moved from unknown to typed structures where feasible.

## Source-Of-Truth Mapping

- DB JSON field -> Effect Schema mapping object:
  - `SqliteV2JsonFieldSchemas` in `packages/contracts/src/methodology-schemas.ts`

This map is the contract bridge for upcoming DB read/write validation and migration safety.

## Remaining Tightening (next pass)

1. Narrow `workflow_definitions.definition_json` from baseline strict shape to full production workflow schema once canonical workflow JSON is locked.
2. Refine optimization payload schemas (`metrics`, `playbook`, scorer payloads) from broad objects to domain-specific structs.
3. Add schema-level branded IDs for stronger cross-table safety (`ProjectId`, `WorkUnitId`, etc.) once contracts package introduces branded primitives.
4. Add decoding entrypoints (`decodeX`) per table JSON field family for consistent runtime validation in API/services.
