# Condition Set Authoring Design

## Goal

Design a detailed, scalable condition-set authoring experience for transition Start/Completion tabs with:

- top-level mode (`all` / `any`), guidance, and description,
- condition sets containing groups and conditions,
- stacked dialogs for group editing,
- fact-based and work-unit-based condition types,
- type-aware operator/value UX,
- deterministic backend validation and persistence.

## Confirmed Product Decisions

1. **Hierarchy**: Condition set is highest level; groups and conditions are nested under it.
2. **Storage**: Persist as JSON in existing `transition_condition_sets.groups_json` model.
3. **Group Editing UX**: Use **stacked dialogs**.
4. **Nesting**: Max **2 levels** for groups.
5. **Fact Operator Scope (v1)**: Use **core operator set first**, advanced operators in v2.

---

## Current-System Baseline

### Existing contract/storage support

- `TransitionConditionSet` already supports `mode`, `phase`, `groups`, `guidance`.
- `TransitionConditionGroup` already supports `mode` and `conditions`.
- Condition rows already support `{ kind, required, config, rationale }`.
- DB table `transition_condition_sets` persists `groups_json` and `guidance_json`.

### Current gaps

- UI is currently shallow for condition editing and not expressive enough for nested/grouped authoring.
- No strict backend registry for `kind`+`config` combinations yet.
- No dynamic operator matrix in UI based on fact type.
- Description support for condition authoring is not consistently represented in current contract shape.

---

## Target Information Architecture

For each transition phase tab (**Start** / **Completion**):

1. **Phase Header**
   - Mode: `all` / `any`
   - Guidance
   - Description

2. **Condition Set Cards**
   - Set title/key
   - Set-level mode
   - Set guidance/description
   - Group count + condition count
   - Manage Groups action

3. **Group Editor (Stacked Dialog)**
   - Group mode (`all` / `any`)
   - Condition list
   - Add condition
   - Add nested group (only when depth < 2)

4. **Condition Builder (Type-driven)**
   - Select condition type (`fact` / `work_unit`)
   - Select target (fact key or work-unit scope/dependency)
   - Select operator (filtered by type)
   - Enter typed values

---

## Condition Type Model (v1)

### 1) Fact-based condition

`kind: "fact"`

Config (conceptual):

- `factKey`
- `operator`
- `value` (optional for unary operators)

Operator matrix by `factType`:

- **string**: `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `in`, `is_empty`, `not_empty`
- **number**: `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `between`, `in`
- **boolean**: `is_true`, `is_false`, `equals`
- **json**: `path_exists`, `path_equals`, `array_contains`, `json_schema_valid`

### 2) Work-unit-based condition

`kind: "work_unit"`

Config (conceptual):

- `scope`: `current` | `linked`
- if linked: `dependencyTypeKey`
- `operator`
- operator-specific fields

Core operators:

- `state_is`, `state_is_not`, `state_in`
- `exists`, `not_exists`
- `count_eq`, `count_gte`, `count_lte` (linked scope)

---

## Dynamic UX Rules

1. User chooses condition type first.
2. If `fact`, selecting a fact key determines allowed operators from its `factType`.
3. Value editor changes by operator + type:
   - text, number, boolean toggle, range pair, list chips, JSON path/value controls.
4. Invalid operator/value combinations are blocked before save.
5. Unknown legacy condition kinds render read-only diagnostic cards.

---

## Validation Strategy

### UI validation

- Required fields
- Duplicate key checks
- Depth limit enforcement (2)
- Operator/value compatibility checks

### API validation

- Discriminated union schemas per condition kind
- Strong `config` schema by kind/operator
- Rejection of invalid type/operator pairings

### Engine validation

- Deterministic diagnostics for invalid/unsupported combinations
- Stable, sorted diagnostic output

---

## Persistence and Compatibility

- Continue using JSON persistence in condition set rows.
- Preserve existing condition sets; no destructive migration.
- Additive schema evolution only (backward-compatible).
- Save path remains single composite transition save for metadata + condition sets + bindings.

---

## Test Plan (Design-level)

1. Contract tests for condition-kind unions and per-type operator constraints.
2. Router/service tests for rejection/acceptance matrices.
3. Web integration tests for:
   - stacked dialogs,
   - depth limit behavior,
   - dynamic operator switching by fact type,
   - round-trip open/edit/save/reopen fidelity.
4. Regression tests for legacy condition JSON loading.

---

## Rollout Phases

### Phase 1 (v1 core)

- Core operator sets
- Stacked dialogs
- Depth limit 2
- Strict kind/config validation

---

## Non-Goals (for this slice)

- Unlimited recursive nesting
- Runtime rule engine redesign
- Bulk migration rewriting all historical condition JSON
- Advanced regex/path-heavy operators
- richer authoring hints/explanations
- optional reusable condition templates
