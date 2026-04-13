# Plain Fact Condition Operators Spec (Lock)

## TL;DR
> **Summary**: Lock the reusable condition-operator behavior for `plain_value_fact` starting with `string`, preserving positive operators + `NOT` semantics, and codifying cardinality as **evaluation semantics** (`ANY`) plus note-text variance.
>
> **Locked now**:
> - `plain_fact:string` operators and runtime semantics
> - `plain_fact:string` validation-driven operator semantics (`allowed-values`, `path`)
> - remove `regex` from string validation options
>
> **Already aligned/locked by decision**:
> - `plain_fact:number` (operator family + cardinality ANY semantics)
> - `plain_fact:boolean` (operator family + cardinality ANY semantics)
>
> **Next scope after this lock**: `plain_fact:json` root/subfield authoring model and runtime notes.

## Context
- User requested that plain fact condition behavior be defined once in a reusable way by underlying operand family and then reused by context-fact kinds.
- User explicitly corrected prior JSON misunderstandings and required explicit runtime notes per operator.
- User requested this lock be persisted so decisions do not drift before proceeding to JSON.

## Global Rules (applies to plain_fact)
1. Operator catalog is positive; negation is via `NOT` toggle (`isNegated`), not separate negative operators.
2. Cardinality (`one` vs `many`) does **not** change operator availability for locked families; it changes note wording and runtime interpretation.
3. Runtime aggregation for condition fulfillment is **ANY**:
   - Condition passes if at least one available instance satisfies the operator.
4. If target instance(s) do not exist for a non-`exists` operator, condition is unfulfilled.

## Locked Spec — plain_fact:string

### Operators (same set for `one` and `many`)
- `exists`
- `equals`
- `contains`
- `starts_with`
- `ends_with`

### Runtime semantics notes
- `exists`: at least one instance of this context fact exists at project runtime.
- `equals`: at least one instance equals the comparison string.
- `contains`: at least one instance contains the comparison substring.
- `starts_with`: at least one instance starts with the comparison string.
- `ends_with`: at least one instance ends with the comparison string.

### Cardinality note variants
- `one`: evaluated over the available instance; condition is unfulfilled when missing.
- `many`: evaluated over all instances; condition passes when at least one instance satisfies operator.

## Locked Spec — string validations

### Validation types
- `none`
- `allowed-values`
- `path` (`file` | `directory`)

### Explicit removal
- `regex` must be removed from authoring/options (not part of locked contract for string).

### Validation-specific semantics

#### allowed-values
- `exists`: default existence semantics (at least one instance exists).
- `equals`: comparison must equal one of selected allowed values.

#### path (file/directory)
- `exists`: default fact-instance existence semantics.
- `exists_in_repo`: at least one instance exists in the project repository.
  - Path values are interpreted as repo-relative.
  - `exists_in_repo` is **path-validation-specific** and not available for non-path string facts.

## Implementation Notes
1. Introduce/operator-note metadata entries for each string operator with two note templates (`one`, `many`).
2. Ensure evaluation pipeline for string uses ANY semantics for both cardinalities.
3. Add path-validation-specific operator exposure rule for `exists_in_repo`.
4. Remove regex from workflow-editor string validation UI and any related transient model types.

## Task-by-Task QA Scenarios (Mandatory)

### Task 1 — Operator notes for string (`one` and `many`)
**Verification command(s)**
- `bun run check-types`

**UI verification flow**
1. Open workflow editor branch route dialog.
2. Select a `plain_fact:string` with cardinality `one`.
3. Open each operator and inspect note/help copy.
4. Repeat with cardinality `many` string fact.

**Expected result**
- Same operator list for `one` and `many`: `exists`, `equals`, `contains`, `starts_with`, `ends_with`.
- Note text differs by cardinality:
  - `one`: single-instance phrasing.
  - `many`: explicit at-least-one-instance phrasing.

### Task 2 — Runtime ANY semantics for string conditions
**Verification command(s)**
- `bunx vitest run packages/methodology-engine/src/tests/l3/l3-design-time-invoke-branch-services.test.ts`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx`

**Scenario to add/validate in tests**
1. Seed two values for a `many` string plain fact: `"alpha"`, `"beta"`.
2. Condition `equals("beta")` should pass.
3. Condition `starts_with("al")` should pass.
4. Condition `ends_with("zz")` should fail.

**Expected result**
- Evaluation semantics are ANY: pass when at least one instance matches.

### Task 3 — `exists_in_repo` only for path-validated string
**Verification command(s)**
- `bun run check-types`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx`

**UI verification flow**
1. Select `plain_fact:string` with validation `none` or `allowed-values`.
2. Open operator list.
3. Switch same fact definition to validation `path` (`file`), then `path` (`directory`).
4. Re-open operator list.

**Expected result**
- `exists_in_repo` absent for non-path string validations.
- `exists_in_repo` present only when validation kind is `path`.
- Note text states paths are repo-relative.

### Task 4 — Remove `regex` from string validation authoring
**Verification command(s)**
- `bun run check-types`
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-invoke-branch.integration.test.tsx`

**UI verification flow**
1. Open string validation type selector in workflow-editor context-fact dialog.
2. Enumerate options.

**Expected result**
- `regex` option is absent.
- Remaining options: `none`, `allowed-values`, `path`.
- No code path serializes regex-specific payloads.

## Acceptance Criteria (for this lock)
- No UI path offers `regex` for plain string validation.
- String operator set is identical for `one` and `many`.
- Runtime/string evaluation uses at-least-one fulfillment semantics.
- `allowed-values` and `path` semantics above are represented in operator notes.
- `exists_in_repo` appears only when string validation kind is `path`.
- All Task-by-Task QA scenarios above pass with expected results.

## Next Step (already queued)
- Define and lock `plain_fact:json` fully:
  - root behavior
  - subfield-targeting behavior
  - subfield-type-inferred operators
  - explicit runtime notes.

---

## Draft Lock (In Progress) — plain_fact:json

### Scope model
- JSON uses explicit scope:
  - `root` (the fact instance itself)
  - `subfield` (one-level field from JSON sub-schema)

### Root operators
- `exists` only.

### Root runtime note
- `exists`: at least one instance of this JSON context fact exists at project runtime.

### Subfield-targeting behavior
1. Selecting a subfield implies evaluation targets that field on available JSON instances.
2. Parent existence is implicit in subfield-targeting mode.
3. Operator set is inferred by selected subfield scalar type:
   - string subfield: `equals`, `contains`, `starts_with`, `ends_with`
   - number subfield: `equals`, `gt`, `gte`, `lt`, `lte`, `between`
   - boolean subfield: `equals`

### Cardinality semantics
- Same as locked global rule: ANY fulfillment.
- For `many`, condition passes if at least one instance’s selected subfield satisfies operator.

### JSON notes to preserve
- Root JSON is container-level existence only.
- Subfield targeting is a scope selector, not an operator.
- No deep nesting in v1 (one-level subfield targeting only).

---

## Cross-Kind Lock Table (Draft v1)

> Purpose: one reusable operator model across all workflow context-fact kinds.
> Evaluation semantics: ANY fulfillment for multi-instance values (condition passes if at least one instance satisfies).

### 1) plain_value_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| string | exists, equals, contains, starts_with, ends_with | n/a | Supports validations `none`, `allowed-values`, `path`; `exists_in_repo` only when validation is `path` |
| number | exists, equals, gt, gte, lt, lte, between | n/a | Numeric comparisons on value |
| boolean | exists, equals | n/a | Strict boolean equality |
| json | exists | subfield-type inferred (string/number/boolean families) | Root is container existence; subfield is one-level scope selector |

### 2) definition_backed_external_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| instance target | exists | n/a | Exists means context-fact instance exists at runtime |
| string | exists, equals, contains, starts_with, ends_with | n/a | Same string family as plain string |
| string + allowed-values | exists, equals | n/a | Equals constrained to selected allowed values |
| string + path (file/dir) | exists, exists_in_repo | n/a | `exists_in_repo` uses repo-relative paths |
| number | exists, equals, gt, gte, lt, lte, between | n/a | Same numeric family |
| boolean | exists, equals | n/a | Same boolean family |
| work unit type | exists, current_state | n/a | `current_state` options sourced from work-unit type’s defined states |

### 3) bound_external_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| instance target | exists | n/a | Exists means bound link resolves to already-existing external fact instance |
| string | exists, equals, contains, starts_with, ends_with | n/a | Mirrors definition-backed external string |
| string + allowed-values | exists, equals | n/a | Equals constrained to selected allowed values |
| string + path (file/dir) | exists, exists_in_repo | n/a | Repo-relative path existence |
| number | exists, equals, gt, gte, lt, lte, between | n/a | Numeric family |
| boolean | exists, equals | n/a | Boolean family |
| work unit type | exists, current_state | n/a | `current_state` options from referenced work-unit states |

### 4) workflow_reference_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| workflow reference | exists, executed, equals | n/a | `exists` = context-fact instance exists only; `executed` = context-fact instance exists + workflow execution instance exists; `equals` options come from allowed workflows configured on the fact |

### 5) artifact_reference_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| artifact reference | exists, fresh | n/a | `exists` = snapshot exists; `fresh` = every file commit in snapshot is latest vs HEAD |

### 6) work_unit_draft_spec_fact

| Variation | Root operators | Targeted operators | Notes |
|---|---|---|---|
| draft-spec instance | exists | fact/artifact targeting from draft spec | `exists` means project work-unit instance exists |
| targeted draft fact | n/a | inferred by targeted fact type family | If no draft fact/artifact selections are configured, all are targetable |
| targeted draft artifact | n/a | exists, fresh (artifact family) | Uses artifact semantics for targeted artifact slots |

## Remaining lock decisions (small)
1. For `work_unit_draft_spec_fact` targeted draft facts, confirm whether targeting should be one-level scalar-only for JSON-like draft facts or keep json-object root with explicit subfield mode.
2. Confirm whether `contains` should remain available for `many` non-string scalar collections globally (or string-only collections for v1).

---

## UI Definition Matrix (All Context Kinds, v1)

### Shared UI frame (all kinds)
Every condition row renders these zones in order:
1. **Context Fact** selector.
2. **Target Scope** selector (hidden for kinds that have only root scope).
3. **Operator** selector (filtered by resolved operand + validation context).
4. **Comparison Input** (shown only when operator requires comparison).
5. **Runtime Note** panel (operator semantics + cardinality variant + validation caveat).

Common note rule:
- For cardinality `many`, append: _"Passes when at least one instance satisfies this condition."_

---

### A) `plain_value_fact`

#### A1. string (`none`)
- Scope control: hidden (root only).
- Operators: `exists`, `equals`, `contains`, `starts_with`, `ends_with`.
- Comparison input:
  - `equals`, `contains`, `starts_with`, `ends_with` → text input.
- Note panel: operator semantics + cardinality variant.

#### A2. string (`allowed-values`)
- Scope control: hidden.
- Operators: `exists`, `equals`.
- Comparison input:
  - `equals` → single-select dropdown from allowed values.
- Note panel:
  - `equals` note explicitly says value must be one of allowed values.

#### A3. string (`path:file|directory`)
- Scope control: hidden.
- Operators: `exists`, `exists_in_repo`.
- Comparison input: none.
- Note panel:
  - `exists`: context-fact instance existence.
  - `exists_in_repo`: at least one value path exists in repo; path is repo-relative.

#### A4. number
- Scope control: hidden.
- Operators: `exists`, `equals`, `gt`, `gte`, `lt`, `lte`, `between`.
- Comparison input:
  - `equals`, `gt`, `gte`, `lt`, `lte` → numeric input.
  - `between` → min/max numeric pair.

#### A5. boolean
- Scope control: hidden.
- Operators: `exists`, `equals`.
- Comparison input:
  - `equals` → boolean segmented toggle (`true` / `false`).

#### A6. json
- Scope control: segmented control:
  - `Root` (default)
  - `Subfield`
- Root operators: `exists` only.
- Subfield UI:
  1. subfield selector (one-level keys from JSON sub-schema),
  2. inferred type badge (`string` / `number` / `boolean`),
  3. operator list inferred by subfield type,
  4. type-specific comparison input.
- Subfield notes include: _"Subfield targeting implies parent JSON fact existence for evaluation."_

---

### B) `definition_backed_external_fact`

#### B1. Generic external instance (root)
- Scope control: hidden.
- Operators: `exists`.
- Comparison input: none.
- Note: checks existence of external-backed context-fact instance at runtime.

#### B2. External valueType = string
- Same UI as A1/A2/A3 depending on validation profile (`none`, `allowed-values`, `path`).

#### B3. External valueType = number
- Same UI as A4.

#### B4. External valueType = boolean
- Same UI as A5.

#### B5. External valueType = work_unit_type
- Scope control: hidden.
- Operators: `exists`, `current_state`.
- Comparison input:
  - `current_state` → single-select dropdown sourced from referenced work-unit type states.
- Note: `current_state` compares the runtime linked work unit’s current lifecycle state.

---

### C) `bound_external_fact`

#### C1. Generic bound instance (root)
- Scope control: hidden.
- Operators: `exists`.
- Comparison input: none.
- Note: existence checks that the bound external link resolves to an already-existing external fact instance.

#### C2-C5. typed variants (string/number/boolean/work_unit_type)
- Same operator/input UI as B2-B5.
- Note wording changes to bound-link semantics where relevant.

---

### D) `workflow_reference_fact`

- Scope control: hidden.
- Operators: `exists`, `executed`, `equals`.
- Comparison input:
  - `equals` → single-select dropdown from fact-configured allowed workflow definitions.
- Notes:
  - `exists`: context-fact instance exists only.
  - `executed`: context-fact instance exists and linked workflow execution instance exists.
  - `equals`: selected workflow must match one of configured allowed workflows.

---

### E) `artifact_reference_fact`

- Scope control: hidden.
- Operators: `exists`, `fresh`.
- Comparison input: none.
- Notes:
  - `exists`: artifact snapshot exists.
  - `fresh`: every file in snapshot is at latest commit relative to HEAD.

---

### F) `work_unit_draft_spec_fact`

Scope selector (required):
1. `Root instance`
2. `Draft fact target`
3. `Draft artifact target`

#### F1. Root instance
- Operators: `exists`.
- Comparison input: none.
- Note: a project work-unit instance exists.

#### F2. Draft fact target
- Sub-target selector:
  - if selections exist in draft-spec config: show only configured fact targets,
  - if none configured: show all fact targets of the selected work-unit type.
- Operator/input model: inferred from targeted fact value type (same families as A1/A4/A5/A6-subfield where applicable).

#### F3. Draft artifact target
- Sub-target selector with same fallback rule as F2.
- Operators: `exists`, `fresh`.
- Comparison input: none.
- Notes use artifact semantics.

---

## UX Conventions (must hold across kinds)
1. Operator list updates immediately when scope/target/validation changes.
2. Invalid stale comparison payloads are reset to operator-specific defaults.
3. Note panel always shows:
   - operator meaning,
   - cardinality variant (`one` vs `many`),
   - validation/scope caveats.
4. Disabled operator options should include short reason tooltip when hidden-by-rule behavior is not obvious.
