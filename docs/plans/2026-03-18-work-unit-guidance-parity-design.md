# Work Unit Guidance Parity Design

**Date:** 2026-03-18

## Goal

Make Work Unit authoring match the artifact/fact authoring pattern instead of the current shallow one-off dialog, with first-class persisted guidance and one coherent create/edit experience.

## Problem

The current Story 3.1 Work Units route still treats authoring as a partial shell:

- create/edit do not match the richer artifact/fact interaction model
- the dialog surface was originally key-only and still lacks artifact-style structure
- guidance is not exposed as a first-class Work Unit authoring concept even though the persistence layer already has `guidance_json`
- multiple entry points risk drifting into different authoring behaviors if they do not share one editor flow

This creates exactly the mismatch the user called out: Work Units feel half-finished compared to artifact/fact authoring even when route parity and validation are fixed.

## Design Direction

Use full artifact-style parity for Work Units.

That means:

- one shared Work Unit editor for both create and edit
- explicit `Contract` and `Guidance` tabs
- persisted guidance as one JSON field with `human` and `agent`
- route/page/palette/quick-add entry points converging on the same authoring flow instead of separate weak variants

## Target Editor Shape

### Contract Tab

The `Contract` tab is the shallow structural definition for a Work Unit:

- `Work Unit Key`
- `Display Name`
- `Description`
- `Cardinality`

This tab is where identity and top-level authoring semantics live.

### Guidance Tab

The `Guidance` tab matches the fact/artifact pattern and persists one guidance object:

```ts
guidance: {
  human: { markdown: string }
  agent: { markdown: string }
}
```

The UI should expose this as:

- `Human Guidance`
- `Agent Guidance`

Each field is authored as markdown text.

## Persistence Model

The database already exposes `guidance_json` on `methodology_work_unit_types` in `packages/db/src/schema/methodology.ts`, so the main requirement is contract and mapping parity rather than inventing a new storage primitive.

Design constraints:

- Work Unit guidance must become a typed part of the shared methodology contract
- repository mapping must read/write `guidance_json`
- null or missing guidance must normalize to an empty guidance state in the UI
- legacy rows must remain readable without migration-only assumptions

## API And Contract Direction

Work Units should mirror the fact guidance pattern rather than inventing a second incompatible shape.

Recommended contract shape:

- introduce a shared audience-markdown JSON shape for Work Unit guidance, reusing the same semantics already used by facts
- add optional `guidance` to the Work Unit contract/input shape
- ensure list/get/update/create payloads preserve that guidance field end to end

If existing effect schemas already provide a reusable `AudienceMarkdownJson` type, prefer reusing it instead of cloning the structure.

## UI Behavior

### Create

- opening `+ Add Work Unit` launches the shared editor modal
- modal opens on `Contract`
- `Next` moves to `Guidance`
- `Back` returns to `Contract`
- final create action persists the full authored model

### Edit

- edit opens the same modal prefilled from the selected work unit
- tabs, validation, and save behavior are identical to create
- no separate lightweight edit surface should remain if it diverges from create

### Entry Point Unification

All authoring entry points should converge on the same editor state machine:

- page action
- command palette action
- any quick-add or graph-driven authoring entry point

Quick-add may preseed fields, but should not maintain a weaker alternative editor if the user is doing real authoring.

## Error Handling

- preserve the existing visible error behavior when create/update fails
- validation errors should remain tied to the Work Unit authoring surface instead of surfacing as silent route failures
- missing legacy guidance should not be treated as an error; it should load as blank guidance fields

## Testing Strategy

The change requires end-to-end parity coverage across layers:

- contract tests for Work Unit guidance shape
- repository tests for `guidance_json` round-trip behavior
- API/router tests for create/update/list/get payloads including guidance
- route integration tests for create/edit modal behavior, tab flow, and persisted data
- compatibility tests proving legacy empty guidance loads cleanly

## Recommended Implementation Order

1. Add or reuse the shared guidance contract type for Work Units.
2. Wire repository and API mappings to persist/read Work Unit guidance.
3. Update Work Unit route projection/types so guidance is available in the UI.
4. Replace the shallow dialog with the two-tab shared editor.
5. Repoint create/edit entry points to the same editor flow.
6. Run full verification for route tests, typecheck, repository/API tests, and repo checks.

## Non-Goals

This design does not expand Work Units into full L2 workflow/state-machine editing. It only brings Work Unit contract/guidance authoring up to the artifact/fact parity the user requested.

## Recommendation

Implement full parity, not another incremental shim.

Reasons:

- the persistence primitive already exists in the DB schema
- the fact system already establishes the desired guidance shape
- the user explicitly asked for artifact-style parity and rejected the shallow half-step
- partial UI-only parity would create another layer of drift instead of resolving the product inconsistency
