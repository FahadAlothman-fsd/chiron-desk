# Contracts Effect Migration Checklist

**Last Updated:** 2026-02-09  
**Status:** Active drift-control checklist

This checklist tracks migration of `@chiron/contracts` from type-only TypeScript contracts to Effect-native schema contracts.

## Current Gap (Verified)

- `packages/contracts/src/index.ts` is plain TypeScript types only.
- Runtime boundaries decode payloads outside the contracts package.
- Multiple modules carry duplicated shape assumptions for the same payloads.

## Target Behavior

1. `@chiron/contracts` exports Effect `Schema` values for all cross-package payloads.
2. TypeScript types are inferred from schema exports (`Schema.Type`).
3. Decode boundaries reuse contract schemas directly.
4. New cross-module payloads are added in contracts first, then consumed.

## Invariants To Enforce

- **Single Definition Source:** one contract schema per cross-package payload.
- **No Shape Drift:** consumer modules do not redefine payload shapes.
- **Decode At Boundary:** routers/adapters decode with contracts schemas before runtime logic.
- **Backward Visibility:** migration keeps consumer compile safety throughout cutover.

## Implementation Checklist

### A) Contract Surface Inventory

- [ ] Enumerate all exported type-only contracts in `packages/contracts/src/index.ts`.
- [ ] Group by domain: agent runtime, stream events, tooling/permissions, workflow payloads.

### B) Schema Authoring

- [ ] Add Effect schema definitions for existing contracts.
- [ ] Export inferred types from schemas for consumer compatibility.
- [ ] Add schema-level docs and examples for high-risk payloads (stream/tool events).

### C) Consumer Migration

- [ ] `@chiron/agent-runtime` switches to schema-derived types + decode helpers.
- [ ] `@chiron/workflow-engine` switches to schema-derived types + decode helpers.
- [ ] `@chiron/api` decode boundaries import schemas from `@chiron/contracts`.
- [ ] Remove duplicated local payload shape definitions where contracts now apply.

### D) Tooling/Permission Contracts (Aligned With DD-002)

- [ ] Add `PermissionAction` schema (`allow | ask | deny`).
- [ ] Add `PermissionRule` and `PermissionRuleset` schemas.
- [ ] Add `PermissionReply` schema (`once | always | reject`).
- [ ] Add request/reply event envelope schemas for permission flow.

### E) Test Gates

- [ ] Schema decode tests for all critical payloads.
- [ ] Round-trip encode/decode tests for stream events.
- [ ] Contract compatibility tests for migrated consumers.

## Cutover Gate

Cut over only when all are true:

- [ ] Contracts package exports schemas for every active cross-package payload.
- [ ] Agent-runtime, workflow-engine, and API boundaries consume schema exports.
- [ ] No critical payload shape is duplicated outside contracts.
- [ ] Tests pass for decode and compatibility flows.

## Ownership

- Contract source ownership: `@chiron/contracts`
- Runtime consumer migration: `@chiron/agent-runtime`, `@chiron/workflow-engine`, `@chiron/api`
