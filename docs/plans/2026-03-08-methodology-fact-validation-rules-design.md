# Methodology Fact Validation Model: Composable Rules + Condition-Set Requiredness

**Status:** Proposed
**Last Updated:** 2026-03-08

## Decision

1) Adopt a composable `validationJson.rules[]` model for methodology facts so a single fact can have multiple validators (e.g., `path` + `allowed-values`, or `json-schema` alone).

2) Implement finite allowed sets as a first-class rule (`kind: "allowed-values"`) that applies to any primitive fact type (`string | number | boolean`).

3) Treat fact-schema and fact-definition `required` booleans as legacy (non-authoritative). Requiredness for gates/readiness is derived from canonical transition condition sets.

## Context

- Current contracts model fact validation as a discriminated union in `packages/contracts/src/methodology/fact.ts`:
  - `kind: "none" | "path" | "json-schema"`
- Current persistence includes `required` fields:
  - `methodology_fact_schemas.required` and `methodology_fact_definitions.required` in `packages/db/src/schema/methodology.ts`.
- Current read models use `required` for preview UX (for example `packages/api/src/routers/project.ts` selects required fact schemas and synthesizes `MISSING_PREVIEW_PREREQUISITE_FACT`).
- Architecture direction explicitly targets condition sets as the canonical gating model and states fact requiredness is not the gate (see `docs/architecture/project-context-only-bmad-mapping-draft.md`).
- The same mapping draft already sketches `validationJson.rules[]` with `allowed-values`, `path`, and `under-root`, which implies the system needs composable validation, not a single `kind`.

## Goals

- Express finite allowed sets (string enums, numeric allowed values, boolean allowed values) concisely.
- Support composition with existing path policy validation and JSON Schema validation.
- Keep validation deterministic (no IO; stable diagnostics ordering).
- Minimize migration blast radius and avoid a flag day.

## Non-Goals

- Introduce runtime gate evaluation (Epic 3+ concerns); this is design-time contract validation only.
- Make `required` a canonical, static property of a fact.
- Support allowed-sets for `factType: "json"` in v1 (use JSON Schema `enum` instead).

## Recommended Validation Model

### 1) V2 contract: `validation.rules[]`

Target shape (illustrative):

```ts
export type FactValidationV2 = {
  rules?: FactValidationRule[]; // missing/empty => no validation
};

export type FactValidationRule =
  | {
      kind: "allowed-values";
      values: Array<string | number | boolean>;
    }
  | {
      kind: "path";
      path: {
        pathKind: "file" | "directory";
        normalization?: { mode?: "posix"; trimWhitespace?: boolean };
        safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
      };
    }
  | {
      kind: "json-schema";
      schemaDialect: string;
      schema: unknown;
    };
```

Semantics:
- `rules` are combined with logical AND (all must pass).
- Deterministic evaluation order:
  1) base type compatibility (factType vs default/value)
  2) `path` rule(s)
  3) `json-schema` rule(s)
  4) `allowed-values` rule(s)
- To reduce ambiguity, v1 should enforce at most one rule per `kind` per fact (`allowed-values`, `path`, `json-schema`).

### 2) Compatibility bridge with current union (`kind: ...`)

To avoid breaking existing stored payloads and in-flight UI payloads:

- Keep the current union as V1 (`FactValidationV1`), but introduce V2 (`FactValidationV2`).
- Accept both at decode boundaries for a transition period.
- Normalize both shapes into an internal `FactValidationRule[]` representation:
  - V1 `kind:"none"` => `[]`
  - V1 `kind:"path"` => `[{ kind:"path", path: ... }]`
  - V1 `kind:"json-schema"` => `[{ kind:"json-schema", schemaDialect, schema }]`

This lets the engine implement allowed-sets immediately (via V2) while still honoring legacy validation payloads.

### 3) Allowed values rule (primitive facts)

Rule: `{ kind: "allowed-values", values: [...] }`

Constraints:
- Applies only when `factType` is one of: `string | number | boolean`.
- `values` must be non-empty.
- Each entry must match the fact type:
  - `string`: all values are strings
  - `number`: all values are finite numbers
  - `boolean`: all values are booleans
- Values must be unique (by strict equality).

Interaction with `path`:
- If a `path` rule exists, allowed-values membership is evaluated against the normalized candidate value (after `trimWhitespace` + `posix` normalization).
- To keep stored constraints predictable, also validate that every allowed string is already in canonical normalized form for the configured `path` rule; emit a blocking diagnostic if not.

### 4) Path rule (string facts)

- `path` remains the same semantic policy already validated in `packages/methodology-engine/src/lifecycle-validation.ts`.
- Rule applies only when `factType === "string"`.
- Validation is semantic only (no filesystem existence checks).

### 5) JSON Schema rule (json facts)

- `json-schema` rule applies only when `factType === "json"`.
- Engine uses Ajv for deterministic schema compilation and default/value validation (as described in `docs/plans/2026-03-03-story-2-4-typed-fact-authoring-design.md`).

## Requiredness: What to do with `required`

### Decision

- `required` on fact schemas/definitions is not authoritative once condition sets exist.
- Canonical requiredness is expressed as transition condition sets (for example conditions like `facts.present` with `config.keys: [...]`) scoped to a transition + gate class.

### Practical compatibility rule

- While condition sets are not yet universally present, `required` remains a legacy hint used only for:
  - preview UX defaults (e.g., showing "missing" indicators), and
  - migration/backfill into condition sets.
- When both exist, condition sets win.

## Architecture trade-offs

### Rules array vs single `validation.kind`

- Rules array pros: composable by construction; avoids union explosion; matches emerging condition-set + rule style in mapping docs.
- Rules array cons: contract decode and UI authoring are slightly more complex; requires a normalization layer during migration.

### Deprecating `required`

- Pros: one source of truth for gating; avoids conflicting "required" semantics across facts, steps, and transitions.
- Cons: requires changes to preview/read models currently reading `required` booleans.

## Practical phased migration plan

### Phase 1 (Quick): Add V2 rules contract + normalization

- Add `FactValidationV2` and `FactValidationRule` to `packages/contracts/src/methodology/fact.ts`.
- Update decoders to accept both V1 and V2 shapes.
- Add a small normalization helper in the engine to convert V1/V2 into `FactValidationRule[]`.

### Phase 2 (Short): Implement `allowed-values` validation in engine

- Extend the fact validators (work-unit and methodology scopes) to evaluate `allowed-values` deterministically.
- Emit deterministic diagnostics with stable scope strings (prefer key-based scopes where possible).

### Phase 3 (Short): UI authoring + projections

- Update methodology authoring UI to edit `allowed-values` as an enum-like control for primitive facts.
- Keep path and json-schema editors unchanged; allow combining `allowed-values` with `path` on string facts.

### Phase 4 (Medium): Condition sets become the requiredness authority

- Introduce canonical condition-set storage/evaluation for transition gates.
- Update readiness preview and any "missing required fact" logic to derive required fact keys from condition sets (not from `required` columns).
- Provide deterministic migration/backfill from legacy `required=true` to condition sets where needed.

### Phase 5 (Medium): Deprecate and eventually remove `required` columns

- Stop writing `required` for new drafts (always false or null in new versions), keeping the column only for backward reads.
- After all pinned versions in active use have condition sets, consider a DB migration to drop the columns.

## Escalation triggers

Revisit this design if:
- you need allowed-values for `factType: "json"` without JSON Schema (then add a JSON-compatible `allowed-json` rule or allow `json-schema` with `enum` only), or
- you need ordering/short-circuit semantics between rules (then add explicit `mode` and rule keys).
