# Draft: BMAD to Chiron Seeding Translation

## Requirements (confirmed)

- [user request]: "i want to come up with a plan to translate the bmad artifacts, workflows into chiron...."
- [current focus]: "right now i want to do: - research (all three market, technical, domain) - project setup - brainstorming"
- [design-time source]: "i want to use all the tables we have at design time and map them...."
- [goal]: "help me extract meaningful relationships between them and structure them in a way that chiron accepts"
- [target Chiron entities]: "project (methodology) facts", "work units", "work unit facts", "work unit states", "work unit workflows", "work unit transitions (bindings, condition sets for both start and completion)", "dependencies between work units (through work unit facts of type \"work unit\"", "workflow steps for each workflow we got (which i think is around 5 workflows)", "work unit artifact slots", "work unit artifact slot templates", "agents"
- [scope emphasis]: "what i want right now is a pure data seeding plan...."
- [mapping standard]: "we should be very explicit in how we define the mapping and why we mapped it that way and how it retains its original purpose or gets enhanced in how it got mapped into chiron"
- [scope reduction]: current seeding scope is limited to the three work units `setup`, `brainstorming`, and `research`.
- [source boundary]: current BMAD source investigation should stay within `_bmad/bmm/1-analysis/` and `_bmad/core/` for now.
- [progressive rollout]: BMAD should be progressively mapped into Chiron while implementing a sample project, specifically the TaskFlow todo app.
- [current deliverable]: user now wants actual candidate seed data, including fields and JSON schemas for JSON-bearing columns.
- [entity detail requirement]: for methodology facts, work-unit facts, states, transitions, condition sets, bindings, workflows, artifact slots/templates, and agents, all in-scope rows should have meaningful description/guidance populated rather than placeholder empties.
- [plan amendment]: add a refactor phase after seeding the locked Slice-A data to normalize `description` and `guidance` as real fields/shapes on the entities that should own them, and remove both from bindings and condition sets.
- [sequencing correction]: refactor the L1/L2 data shapes first, then seed the locked data into those corrected shapes.
- [completion boundary]: this plan must fully finish both `data shapes` and `seeding` for all in-scope L1 and L2 entities; workflow-step/L3 work will be handled by a later separate plan.
- [versioning requirement]: the overall seed must include the methodology definition plus two methodology versions carrying the same underlying Slice-A canonical data: one `published/active` version and one `draft` version for further editing.
- [definition refinement]: the methodology definition likely already exists, but the plan should explicitly refine it as part of this same effort rather than treating it as frozen baseline.
- [L2 before L3]: lock L2 fully first; preliminary workflow steps are needed now, but detailed step config/value design will be discussed later as L3.
- [setup shape]: `WU.SETUP` must account for both greenfield and brownfield BMAD handling; greenfield is the immediate focus, while brownfield should still have a tentative step shape captured now.
- [artifact templating]: artifact templates should demonstrate variable resolution using facts only (not direct work-unit references), with handling semantics that vary by fact type and support Handlebars-like conditionals/iterations.
- [agents]: seed agent rows should be grounded in actual BMAD agents that conduct agent steps, starting from the known analyst lineage and any other in-scope personas from `_bmad/core/` and `_bmad/bmm/1-analysis/`.
- [phasing request]: lock L1 first before L2, specifically: methodology facts, work-unit definitions, dependency definitions, and agents.
- [new L1 addition]: add a methodology-level `Project Root Directory` fact for the OpenCode harness; it should be treated as a directory/path-style fact used by agent-step harness execution.
- [dependency semantics clarification]: work-unit-to-work-unit dependency should be established through work-unit facts that reference other work units; dependency definitions explain the relationship semantics, while the reference fact creates the actual linkage.

## Refactor Touch Assessment

- Refactor scope must cover five coordinated surfaces: contracts, DB schema, frontend authoring tabs, workspace normalization/serialization, and the seeding pipeline/tests.
- Confirmed contract seams:
  - `packages/contracts/src/methodology/lifecycle.ts` still uses plain-string descriptions for some L1/L2 entities, keeps `guidance` on condition sets, and lacks first-class transition description/guidance.
  - `packages/contracts/src/methodology/fact.ts` still lacks first-class `factType: "work unit"` support and uses plain-string descriptions.
  - `packages/contracts/src/methodology/artifact-slot.ts` still types slot/template `description` as `AudienceGuidance` instead of `{ markdown }`.
- Confirmed DB schema seams in `packages/db/src/schema/methodology.ts`:
  - agents and work-unit facts still persist plain-text descriptions,
  - transitions lack `descriptionJson`,
  - condition sets still persist `guidanceJson`,
  - bindings still persist `guidanceJson`,
  - workflows still lack first-class `descriptionJson`.
- Confirmed frontend authoring seams:
  - `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` still treats state descriptions as strings and still exposes condition-set guidance / non-persisted description draft state.
  - `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` already supports `factType: "work unit"` but still uses string descriptions.
  - `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` still stores workflow description in `metadata.description`.
  - `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` still uses the wrong description shape for slot/template descriptions.
- Confirmed legacy normalization seam:
  - `apps/web/src/features/methodologies/version-workspace.tsx` still carries older guidance models and description/guidance normalization that will conflict with the target ownership model if not refactored.
- Refactor should explicitly avoid expanding into L3 workflow steps/edges or unrelated methodology families; the purpose is to make L1/L2 authoring, persistence, and seeding conform to the locked Slice-A data model.

## Recommended Refactor Order

1. **Lock shared contract shapes first**
   - Touch `packages/contracts/src/methodology/fact.ts`, `packages/contracts/src/methodology/lifecycle.ts`, and `packages/contracts/src/methodology/artifact-slot.ts` first.
   - Goal: make the TypeScript contract model reflect the approved ownership rules before changing persistence or UI.

2. **Align DB persistence with the new contract model**
   - Touch `packages/db/src/schema/methodology.ts` next.
   - Goal: add/remove `description` / `guidance` storage at the table level so contracts and persistence stop disagreeing.

3. **Refactor workspace normalization / load-save serialization before polishing individual tabs**
   - Touch `apps/web/src/features/methodologies/version-workspace.tsx` first, then `apps/web/src/features/methodologies/version-workspace-author-hub.tsx` if it shares payload transforms.
   - Goal: remove the legacy normalization path that would otherwise reintroduce stale shapes after the tab editors are fixed.

4. **Refactor the L2 authoring tabs to use the new shapes**
   - Touch, in order:
     - `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`
     - `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
     - `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`
     - `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
   - Goal: make the visible editor surfaces author the same shapes that contracts + schema now expect.

5. **Refactor any remaining methodology authoring defaults / bootstrap surfaces**
   - Check `apps/web/src/features/methodologies/foundation.ts` and any overview/bootstrap components that materialize default methodology payloads.
   - Goal: ensure default objects do not recreate stale description/guidance ownership or step/edge assumptions.

6. **Only after the model is stable, refactor the existing seeding procedure**
   - Touch `packages/scripts/src/seed/methodology/**`.
   - Goal: update the existing seeding pipeline to emit corrected L1/L2 rows, one methodology definition, and dual methodology versions (`draft` + `active`) without carrying the old shapes forward.

7. **Then rewrite verification around the corrected model**
   - Touch `packages/scripts/src/tests/seeding/**`.
   - Goal: assert the corrected ownership model, deterministic L1/L2 rows, absence of forbidden step/edge seed rows, and the presence of both methodology versions.

8. **Only after all seven prior stages, seed the locked Slice-A data**
   - Seed L1 first, then `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH` L2 rows, then the three research workflow rows/bindings.
   - Goal: avoid writing payloads against a model that is still in flux.

## Technical Decisions

- Planning mode only: produce design + decision-complete seeding plan, not implementation.
- Treat current canonical Chiron architecture docs as authority; treat historical BMAD lineage docs as source material, not runtime truth.
- Focus first on seedable design-time entities and relationships before any runtime execution concerns.
- Working recommendation: keep `WU.SETUP` separate, add `WU.BRAINSTORMING` as its own slice, and model market/domain/technical as three workflows under one `WU.RESEARCH` work-unit type unless lifecycle/dependency semantics force a split.
- Working recommendation: classify every BMAD element as one of `seeded`, `runtime-only`, `lineage-only`, `deferred` to avoid leaking execution concerns into seed design.
- Confirmed: first-slice research will be modeled as one `WU.RESEARCH` work-unit type with three workflows.
- Corrected interpretation: workflows are work-unit-owned execution definitions, not free-standing methodology entities in the semantic model; every seeded workflow must be attached to exactly one work unit and interpreted through that work unit's lifecycle, facts, artifacts, and transitions.
- Critical user correction: not every work-unit-level workflow is transition-bound. Advanced elicitation should be treated as a support workflow owned at the work-unit level, and interpreting it as transition-bound is contrary to the intended system design.
- Current planning cut: do not attempt to seed the broader BMAD family inventory now; progressively translate BMAD into Chiron through the lived implementation path of the TaskFlow sample project.
- Repo-grounded clarification: `methodology_workflows` is the work-unit-scoped workflow catalog; `methodology_transition_workflow_bindings` is the transition-scoped executable subset. A support workflow may be owned/catalogued under a work unit without being bound to a transition.
- Current in-scope BMAD source material is constrained to `_bmad/core/` and `_bmad/bmm/1-analysis/`, with primary work-unit workflows for setup, brainstorming, and the three research variants, plus support workflows such as advanced elicitation (and possibly party mode as later support lineage).
- Current design target is candidate seeded rows/spec payloads, not implementation edits: enough specificity to lock entity semantics and JSON shapes, while leaving detailed per-step config contracts for the later L3 discussion.
- L2 framing lock: present concrete payloads now for the real Chiron entities (facts, states, transitions, bindings, workflows, artifact slots/templates, agents), but keep detailed per-step config semantics, transition execution sequencing, and brownfield repository-discovery internals marked as L3/deferred.
- Greenfield setup is normative for the first payload pass; brownfield setup should appear as a reserved/tentative shape unless stronger evidence or explicit user preference promotes it.
- Support workflows should be represented at work-unit scope through advisory/support references rather than premature transition semantics when showing L2 examples.
- User-corrected modeling rule: work-unit facts must support a `work_unit` fact type for dependency/reference semantics (e.g. brainstorming/research referring to setup work units and using their facts in transition conditions). Current contract limits are a design/implementation seam, not a reason to avoid modeling that truth in the seed design.
- Clarified scope of that rule: `work_unit` is reserved for work-unit facts, not methodology facts. The contract concern is whether the visible authoring/type surfaces cleanly encode that distinction and expose the needed dependency semantics.
- L1 methodology facts should now include a project-root path/directory fact because OpenCode harness execution requires a working directory and AI SDK is no longer the intended harness path.
- Dependency model decision: dependency definitions remain semantic labels only; actual graph edges are realized when a work-unit fact stores a referenced work unit. In practice, a work unit that carries another work unit as a fact depends on that referenced work unit.
- New planning constraint from deeper `_bmad/` investigation: do not treat brainstorming and research as the whole BMAD universe; `_bmad/` contains broader workflow families (core, bmm, tea, cis), and Slice A must be justified as an intentional first cut rather than an exhaustive methodology port.
- New planning constraint: advanced elicitation is not just a brainstorm-internal note; it is a standalone BMAD workflow with a 50-method registry and should be explicitly classified as deferred, absorbed into brainstorming, or promoted to its own future work unit family.
- Locked refactor sequencing: the execution plan must explicitly do `(1) seed the locked data` and then `(2) refactor description/guidance ownership and shapes` rather than silently blending both concerns.
- Superseding sequencing rule: the execution plan must explicitly do `(1) refactor description/guidance ownership and shapes first`, then `(2) seed the locked L1/L2 data into those corrected shapes`, rather than silently blending both concerns.
- Locked ownership rule for descriptive metadata:
  - L1 entities that must have both `description` and `guidance` with explicit JSON shapes: methodology facts, dependency definitions, agents, work-unit definitions.
  - L2 entities that must have both `description` and `guidance` with explicit JSON shapes: work-unit facts, work-unit states, work-unit workflows, work-unit artifact slots, artifact slot templates, transitions.
  - Condition sets and transition bindings must have neither `description` nor `guidance`; if either field exists in current schema/contracts/frontend, the refactor plan must remove it.
- Locked versioning rule:
  - Seed one refined methodology definition for the BMAD→Chiron methodology.
  - Seed two methodology versions that share the same underlying L1/L2 canonical rows for this slice: one editable `draft` version and one `published/active` version.
  - The plan must verify that both versions are present and semantically aligned, with status/versioning differences made explicit rather than inferred.
- New modeling seam discovered: fact definitions currently lack a first-class cardinality field even though some locked use cases need “single value vs many values of the same type” semantics.
- Working recommendation: add a dedicated `cardinality` field to both methodology-fact and work-unit-fact definitions rather than overloading multiplicity into `factType` or forcing all multi-value cases into opaque JSON blobs.
- Working recommendation: keep fact cardinality simple (`one | many`) and do not add a second platform-wide ordered/unordered axis unless a later concrete use case proves it necessary. When ordering/prioritization matters, preserve it inside the fact value/schema (array order and/or explicit `priority` / `rank` fields).
- Clarified recommendation after runtime discussion: add `cardinality` as a separate field on both methodology-fact and work-unit-fact definitions. For non-JSON many-valued facts, preserve order by insertion only; for JSON facts, allow ordering semantics to be expressed inside the schema/value itself rather than through a second platform-wide ordering field.
- Current slice recommendation: replace brainstorming's singular `objective` fact with plural `objectives`, modeled as a goal-oriented JSON fact with `cardinality: many`.
- Clarified ordering rule: for `cardinality: many`, non-JSON facts preserve insertion order only. JSON many-valued facts may optionally declare ordering semantics inside their schema/value (for example via an item key such as `priority` / `rank`) rather than through a separate fact-definition field.
- Additional slice lock: `research_goals` should also be modeled as a structured many-valued JSON fact rather than a single string, while keeping the existing plural key.
- Additional nested-schema lock: JSON sub-schema fields also support `type` + `cardinality`; `many` at the sub-schema level means list-valued fields, not a new synthetic type. List-valued sub-schema fields should not carry scalar defaults.
- Locked representation for `selected_directions`: nested categorized fields remain `array<string>` lists (`primary_directions`, `quick_wins`, `breakthrough_concepts`), not arrays of structured objects.
- Locked string-content rule: plain `string` facts and plain `string` JSON sub-schema fields may contain markdown-authored content because markdown is stored as string data; no separate `markdown` fact type is required. Rendering semantics remain consumer-driven rather than implicit in the stored type.
- Locked storage/validation split: canonical fact-definition storage stays Chiron-native (`type`, `cardinality`, dependency semantics, nested sub-schema fields expressed as `type + cardinality`) rather than raw JSON Schema authoring.
- Locked runtime validation rule: JSON Schema draft `2020-12` is a compiled validation artifact for JSON facts / JSON sub-schemas, not the canonical authoring model.
- Locked MCP fact-write rule: future fact setting through the MCP action tool should validate at write time by loading the fact definition, checking type/cardinality/dependency/reference shape/path rules/compiled JSON validation, and only then persisting or returning structured validation errors. Transition evaluation should consume already-validated fact values rather than be the primary validator.
- Locked seed-layout correction: rename `packages/scripts/src/seed/methodology/tables/methodology-fact-schemas.seed.ts` to `packages/scripts/src/seed/methodology/tables/work-unit-fact-definitions.seed.ts`, because the module populates the `work_unit_fact_definitions` table and should not imply methodology-level fact ownership.
- Locked seed-layout implementation rule: the table modules `packages/scripts/src/seed/methodology/tables/methodology-artifact-slot-definitions.seed.ts` and `packages/scripts/src/seed/methodology/tables/methodology-artifact-slot-templates.seed.ts` are real implementation targets in this plan. They should be created or replaced with actual Slice-A row builders and exports, not left as placeholder or follow-up design notes.

## Research Findings

- [docs/architecture/methodology-bmad-setup-mapping.md]: active canonical mapping exists for `WU.SETUP`; canonical-table-first mapping, progressive slice expansion, and rationale capture are already explicit.
- [docs/README.md]: `docs/architecture/epic-3-authority.md` is the entry authority; `docs/architecture/project-context-only-bmad-mapping-draft.md` and `docs/architecture/bmad-e2e-rigorous-example.md` are contextual lineage, not canonical implementation truth.
- [docs/architecture/bmad-e2e-rigorous-example.md]: preserves historical BMAD workflow lineage for setup, brainstorming, and downstream planning chain, but uses pre-lock invoke/output examples and is not current contract authority.
- [packages/db/src/schema/methodology.ts + packages/contracts/src/methodology/*]: Chiron already has canonical schema/contracts for methodology versions, work unit types, lifecycle states/transitions, condition sets, work-unit/methodology facts, workflows, steps, edges, bindings, artifact slots/templates, and agents.
- [_bmad/_config/workflow-manifest.csv + _bmad/_config/agent-manifest.csv]: BMAD source inventory includes 39 workflows and 19 agent definitions; the current user-requested first slice aligns cleanly to 5 workflows: setup, brainstorming, market research, domain research, technical research.
- [oracle review]: strongest mapping strategy is slice-by-slice seed packets with explicit mapping matrix, dependency/gate graph, and rationale appendix so executors transcribe rows instead of making design choices.
- [_bmad/_config/workflow-manifest.csv]: BMAD currently registers 39 workflows across `core`, `bmm`, `tea`, and `cis`, including `brainstorming`, `party-mode`, `document-project`, `generate-project-context`, `design-thinking`, `innovation-strategy`, `problem-solving`, and `storytelling`, so slice selection must be explicit.
- [_bmad/core/workflows/advanced-elicitation/workflow.xml + methods.csv]: advanced elicitation is a concrete workflow backed by a 50-method registry spanning collaboration, advanced, competitive, technical, creative, research, risk, core, learning, philosophical, and retrospective categories; brainstorming step execution explicitly invokes it.
- [_bmad/_config/agent-manifest.csv]: BMAD has a rich canonical agent/persona inventory with practical first-slice candidates beyond the earlier two-agent simplification, especially `analyst`/Mary and `brainstorming-coach`/Carson, plus additional CIS personas relevant to advanced elicitation.
- [_bmad/core/bmad-index-docs/SKILL.md +_bmad/bmm/1-analysis/bmad-document-project/workflow.md]: BMAD definitely has document-generation/documentation utilities, but current evidence points more toward folder indexing and brownfield project documentation than a dedicated setup-generated `README.md` workflow; README-as-setup-artifact remains plausible but is not yet directly evidenced as canonical BMAD setup output.
- [packages/contracts/src/methodology/* + packages/db/src/schema/methodology.ts]: Chiron JSON-bearing fields consistently use `AudienceGuidance` for many `descriptionJson`/`guidanceJson` columns, `WorkflowMetadata` for workflow `metadataJson`, `FactValidation` for validation payloads, and structured JSON for step config, transition condition groups, artifact slot rules, model references, and prompt templates.
- [packages/contracts/src/methodology/workflow.ts + packages/contracts/src/methodology/lifecycle.ts + docs/architecture/chiron-module-structure.md + docs/architecture/modules/README.md]: workflows are authored under work-unit scope, while transition bindings and condition sets are state-machine-owned transition concerns; work units own facts, state machine, workflows, and bindings as separate but related aggregates.
- [_bmad/core/bmad-init/**]: setup in BMAD is primarily a config/bootstrap capability producing config files and directories rather than a rich report artifact.
- [_bmad/core/bmad-brainstorming/**]: brainstorming is a primary work-unit-level workflow producing a durable brainstorming session document; its technique execution can invoke advanced elicitation for deeper treatment.
- [_bmad/bmm/1-analysis/research/**]: market/domain/technical research are primary work-unit-level workflows producing standalone research reports with sources and synthesis.
- [_bmad/core/bmad-advanced-elicitation/**]: advanced elicitation is explicitly designed both for indirect invocation from other workflows and standalone use, making it a strong fit for a work-unit-owned support workflow rather than a transition-bound one.
- [packages/contracts/src/methodology/fact.ts]: `FactType` is currently limited to `string | number | boolean | json`; `FactValidation` is a discriminated union with `none`, `path`, and `json-schema` kinds.
- [user clarification after L2 base review]: despite the current contract limitation, the target methodology design requires `work_unit` facts for inter-work-unit dependency semantics, especially setup → brainstorming/research dependencies and transition conditions.
- [user clarification on harness/runtime direction]: current harness direction is OpenCode-only for now, so project-root directory should be modeled as a methodology-level path fact supporting harness execution context.
- [packages/contracts/src/methodology/guidance.ts]: `AudienceGuidance` is the canonical JSON shape for most description/guidance columns: `{ human: { markdown }, agent: { markdown } }`.
- [packages/contracts/src/methodology/lifecycle.ts]: transition condition sets require `groups`, each group requires `conditions`, and gating semantics are expressed with `phase: start|completion` plus `mode: all|any`.
- [packages/contracts/src/methodology/version.ts]: workflow `metadata` is a string-keyed record whose values are limited to `string | number | boolean | string[]`; workflow step `config` and edge `condition` remain flexible/unknown and therefore should stay tentative until L3.
- [_bmad/core/bmad-init/**]: setup’s strongest directly evidenced durable outputs are config/bootstrap artifacts, not a canonical README.
- [_bmad/bmm/1-analysis/bmad-document-project/**+ bmad-generate-project-context/**]: brownfield setup/documentation patterns are rich and real, but most of their scan/resume/deep-dive mechanics exceed the current L2 lock and should inform only a tentative brownfield shape for now.
- [oracle review `bg_f5f6a605`]: most defensible response structure is to lock real L2 entity payloads now, separate locked vs tentative sections explicitly, keep support-workflow references advisory, and use facts-only template interpolation syntax (`{{facts.x}}`, `{{#if facts.x}}`, `{{#each facts.list}}`).
- [runtime grounding]: current `packages/project-context` and `packages/db/src/schema/project.ts` do **not** yet define persisted runtime tables for work units, project facts, or work-unit facts. The currently landed runtime/project-context tables are only `projects`, `project_methodology_pins`, `project_methodology_pin_events`, and `project_executions`.
- [runtime grounding]: current transition evaluation in `packages/project-context/src/transition-condition-evaluator.ts` operates on in-memory inputs like `factValues`, `knownWorkUnitTypeKeys`, `activeWorkUnitTypeKey`, and `currentState`; it is not backed by persisted runtime fact/work-unit tables yet.

## Open Questions

- Still need to confirm whether setup should own a durable documentation artifact in the current narrow slice, or whether documentation remains out of scope until later sample-project progression proves it.
- Need one explicit user decision on how aggressive to be with setup documentation artifacts in the first payload pass if `_bmad/` evidence remains partial (e.g. README slot now vs defer to later sample-project progression).
- Need user approval on the proposed L1 seed set before drafting L2 entities (states, transitions, condition sets, bindings, workflows, slots/templates).
- Need explicit lock on the brainstorming goal fact redesign: whether the current singular `objective` should be replaced by a plural `objectives` fact with goal-oriented structured schema and `cardinality: many`.
- Resolved: `research_goals` joins brainstorming `objectives` as a clearly justified Slice-A many-valued fact; other Slice-A facts remain `cardinality: one` unless later evidence proves otherwise.
- Need a dedicated runtime-shape design soon for persisted project-context entities, because runtime tables for work units, project facts, and work-unit facts are not landed yet even though methodology planning now depends on those concepts.

## Locked Plan Amendment — Description / Guidance Refactor

- Before the locked Slice-A seed data is written, the plan must include a dedicated refactor stream to normalize descriptive metadata ownership across schema, contracts, frontend editors, serializers, and seed payloads.
- The intended distinction is:
  - `description`: short entity description payload with JSON shape `{ "markdown": string }`
  - `guidance`: audience-scoped usage/help payload with JSON shape `{ "human": { "markdown": string }, "agent": { "markdown": string } }`
- This refactor is in-scope even though current frontend truth is inconsistent, because the user explicitly wants the plan to correct those seams rather than merely document them.
- Condition sets are explicitly exempt from description support and should also lose guidance. Transition bindings should also have neither field.
- This refactor applies to the already-discussed `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH` payloads too; the final seed plan must seed the corrected shapes, not the pre-refactor ones.

## Locked Plan Amendment — Methodology Definition and Dual Versions

- The plan must cover the overall seed surface, not only the per-entity row shapes discussed in this draft.
- That means the final seed includes:
  - the methodology definition row (refined as needed), and
  - two methodology version rows referencing the same underlying Slice-A canonical data:
    - one draft version for ongoing editing
    - one published/active version for stable use
- The plan must treat L1 and L2 as complete only when both of these are true:
  - the corrected data shapes are implemented and verified
  - the canonical seed data for those entities is populated and verified in both required methodology versions

## Scope Boundaries

- INCLUDE: canonical entity mapping, relationship extraction, workflow/work-unit translation rationale, seeding structure, slice boundaries, authority precedence.
- EXCLUDE: executing seeds, editing code, changing schemas, implementing workflow runtime behavior.

## Locked Seed Snapshot (L1)

### Methodology Facts (locked)

```json
[
  {
    "id": "seed:mfact:communication-language",
    "key": "communication_language",
    "name": "Communication Language",
    "factType": "string",
    "cardinality": "one",
    "defaultValue": "English",
    "description": {
      "markdown": "Default language used for interactive guidance and conversational responses across the methodology."
    },
    "guidance": {
      "human": {
        "markdown": "Sets the default language Chiron uses when guiding people through setup, brainstorming, and research."
      },
      "agent": {
        "markdown": "Use this as the default response language unless a more specific project or runtime override is present."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "id": "seed:mfact:document-output-language",
    "key": "document_output_language",
    "name": "Document Output Language",
    "factType": "string",
    "cardinality": "one",
    "defaultValue": "English",
    "description": {
      "markdown": "Default language used for persisted methodology artifacts such as setup summaries, brainstorming outputs, and research deliverables."
    },
    "guidance": {
      "human": {
        "markdown": "Controls the language of generated documents and saved artifacts."
      },
      "agent": {
        "markdown": "When producing durable artifacts, prefer this language unless the work unit or runtime context explicitly overrides it."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "id": "seed:mfact:project-root-directory",
    "key": "project_root_directory",
    "name": "Project Root Directory",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "Canonical project working directory used by the OpenCode harness when executing agent-driven steps against the project."
    },
    "guidance": {
      "human": {
        "markdown": "Set this to the repository root or other intended working directory for harness-driven work."
      },
      "agent": {
        "markdown": "Use this as the default working directory for OpenCode harness operations unless a step explicitly overrides it."
      }
    },
    "validation": {
      "kind": "path",
      "path": {
        "pathKind": "directory",
        "normalization": { "mode": "posix", "trimWhitespace": true },
        "safety": { "disallowAbsolute": false, "preventTraversal": true }
      }
    }
  }
]
```

### Work Unit Definitions (locked)

```json
[
  {
    "id": "seed:wut:setup",
    "key": "setup",
    "displayName": "Setup",
    "description": {
      "markdown": "Establishes the foundational project context needed before deeper ideation or analysis work begins."
    },
    "guidance": {
      "human": {
        "markdown": "Use Setup to establish the project baseline. In greenfield work, this means defining the initial project shape. In brownfield work, this means understanding the existing project well enough to support downstream work."
      },
      "agent": {
        "markdown": "Setup is the canonical source of baseline project context. Downstream work units should depend on setup-owned facts rather than re-deriving foundational project assumptions."
      }
    },
    "cardinality": "one_per_project"
  },
  {
    "id": "seed:wut:brainstorming",
    "key": "brainstorming",
    "displayName": "Brainstorming",
    "description": {
      "markdown": "Explores options, perspectives, and possible solution directions before detailed commitment."
    },
    "guidance": {
      "human": {
        "markdown": "Use Brainstorming when you need to open the design space, compare alternatives, and shape promising directions before committing to detailed execution."
      },
      "agent": {
        "markdown": "Brainstorming produces exploratory output, not final implementation truth. Preserve option space, surface tradeoffs, and connect ideas back to setup context."
      }
    },
    "cardinality": "many_per_project"
  },
  {
    "id": "seed:wut:research",
    "key": "research",
    "displayName": "Research",
    "description": {
      "markdown": "Collects evidence and structured analysis to support decisions made during planning and implementation."
    },
    "guidance": {
      "human": {
        "markdown": "Use Research to gather market, domain, and technical evidence that informs design and execution decisions."
      },
      "agent": {
        "markdown": "Research should be evidence-oriented and decision-supportive. Preserve traceability to the setup context and, when relevant, to brainstorming outputs that shaped the research question."
      }
    },
    "cardinality": "many_per_project"
  }
]
```

### Dependency Definitions (locked semantic labels)

```json
[
  {
    "id": "seed:dep:requires-setup-context",
    "key": "requires_setup_context",
    "name": "Requires Setup Context",
    "description": {
      "markdown": "Indicates that a downstream work unit depends on setup-established project context before it can proceed meaningfully."
    },
    "guidance": {
      "human": {
        "markdown": "Use this dependency when work should only proceed after setup has established the foundational project context."
      },
      "agent": {
        "markdown": "This dependency signals that the upstream setup work unit is the authoritative source of baseline project facts needed by the dependent work unit."
      }
    }
  },
  {
    "id": "seed:dep:informed-by-brainstorming",
    "key": "informed_by_brainstorming",
    "name": "Informed by Brainstorming",
    "description": {
      "markdown": "Indicates that a downstream work unit uses brainstorming output as an input to shape its scope, direction, or evidence gathering."
    },
    "guidance": {
      "human": {
        "markdown": "Use this dependency when earlier brainstorming work meaningfully shapes what the downstream work should investigate or produce."
      },
      "agent": {
        "markdown": "Treat brainstorming as an upstream source of direction, framing, and candidate focus areas, not as final truth."
      }
    }
  }
]
```

### Agents (locked)

```json
[
  {
    "id": "seed:agent:bmad-analyst",
    "key": "bmad_analyst",
    "displayName": "BMAD Analyst",
    "description": {
      "markdown": "Strategic business analyst for setup discovery and research-oriented analysis."
    },
    "guidance": {
      "human": {
        "markdown": "Use this agent for setup discovery and research work that requires structured analysis, evidence gathering, and requirements framing."
      },
      "agent": {
        "markdown": "Act as the canonical analysis-oriented methodology agent for setup, market research, domain research, and technical research. Reduce ambiguity through evidence-backed structure rather than speculative invention."
      }
    },
    "persona": "Senior analyst with strong capability in market research, competitive analysis, domain framing, and requirements discovery. Works from evidence and turns ambiguity into structured understanding.",
    "promptTemplate": {
      "markdown": "You are the BMAD Analyst operating inside Chiron. Your job is to analyze the current work unit objective, use available facts and artifacts, and produce structured findings that reduce ambiguity and support downstream planning."
    },
    "mcpServers": [],
    "capabilities": [
      "setup-discovery",
  "market_research",
  "domain_research",
  "technical_research",
      "requirements-elicitation"
    ]
  },
  {
    "id": "seed:agent:bmad-brainstorming-coach",
    "key": "bmad_brainstorming_coach",
    "displayName": "BMAD Brainstorming Coach",
    "description": {
      "markdown": "Facilitates structured ideation sessions and helps teams expand and organize solution space."
    },
    "guidance": {
      "human": {
        "markdown": "Use this agent when the goal is to widen option space, test multiple directions, and organize emerging ideas before commitment."
      },
      "agent": {
        "markdown": "Guide structured ideation productively. Encourage divergence first, then help converge on promising directions without collapsing the space too early."
      }
    },
    "persona": "Energetic brainstorming facilitator who encourages exploration, structured ideation, and creative divergence before convergence.",
    "promptTemplate": {
      "markdown": "You are the BMAD Brainstorming Coach operating inside Chiron. Your job is to guide ideation productively, broaden the option space, surface tradeoffs, and help organize emerging ideas into useful directions."
    },
    "mcpServers": [],
    "capabilities": [
      "brainstorm-facilitation",
      "creative-divergence",
      "idea-clustering",
      "idea-convergence",
      "elicitation-support"
    ]
  },
  {
    "id": "seed:agent:bmad-tech-writer",
    "key": "bmad_tech_writer",
    "displayName": "BMAD Technical Writer",
    "description": {
      "markdown": "Produces clear durable documentation artifacts from setup and research outputs when documentation needs to be persisted."
    },
    "guidance": {
      "human": {
        "markdown": "Use this agent when durable setup or research artifacts need to be written clearly and without unsupported embellishment."
      },
      "agent": {
        "markdown": "Convert validated facts and findings into clear durable artifacts. Do not invent unsupported detail and do not replace the analysis or brainstorming agents when those workflows still need their core facilitation roles."
      }
    },
    "persona": "Technical documentation specialist focused on clarity, structure, and usable written artifacts for both humans and AI systems.",
    "promptTemplate": {
      "markdown": "You are the BMAD Technical Writer operating inside Chiron. Your job is to convert validated facts and findings into clear, structured, durable artifacts without inventing unsupported detail."
    },
    "mcpServers": [],
    "capabilities": [
      "artifact-authoring",
      "project-context-writing",
      "setup-summary-writing",
      "research-synthesis-writing"
    ]
  }
]
```

### Locked L1 modeling notes

- `project_root_directory` is locked as a methodology fact because OpenCode harness execution needs a canonical working directory.
- Locked L1 metadata ownership now fully matches the approved target shape: methodology facts, dependency definitions, work-unit definitions, and agents all carry `description: { markdown }` plus audience-scoped `guidance`.
- Locked fact-definition shape now includes first-class `cardinality` on methodology facts and work-unit facts.
- Dependency definitions are semantic labels only.
- Actual dependency edges are established when a work-unit fact of type `work_unit` references another work unit.
- Enforcement of those dependencies belongs to L2 transition condition sets, not L1 dependency definitions.
- Locked template semantics: fact-backed template variables must be safe to render conditionally when values are absent at runtime, and list-valued facts should be assumed renderable through iteration helpers / block syntax rather than flat string interpolation only.

## Locked Seed Snapshot (L2) — `WU.SETUP`

### L2 frontend alignment notes

- Current frontend/runtime-supported transition condition kinds are only `fact` and `work_unit`.
- A trivially true start gate should be represented as `groups: []`; the current runtime evaluates an empty condition-set group list as met.
- Locked target shape for this draft: work-unit facts, states, workflows, artifact slots/templates, and transitions should all carry both `description` and `guidance`.
- Locked target shape for this draft: `description` uses `{ "markdown": string }`; `guidance` uses `{ "human": { "markdown": string }, "agent": { "markdown": string } }`.
- Locked target shape for this draft: condition sets and transition bindings should carry neither `description` nor `guidance`.
- Artifact template variables should use the current frontend namespaces: `methodology.facts.*`, `workUnit.facts.*`, and `methodology.workUnits.*`.
- Artifact-presence conditions are not currently supported by the state-machine frontend/runtime, so setup completion is modeled with fact conditions only for now.

### `WU.SETUP` — Work-Unit Facts

```json
[
  {
    "key": "initiative_name",
    "name": "Initiative Name",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "Human-readable name of the project or initiative being set up."
    },
    "guidance": {
      "human": {
        "markdown": "Use the name that should appear in setup-owned artifacts."
      },
      "agent": {
        "markdown": "Treat this as the canonical display name for setup outputs."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "key": "project_kind",
    "name": "Project Kind",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "Routing mode for setup."
    },
    "guidance": {
      "human": {
        "markdown": "Allowed values: `greenfield`, `brownfield`."
      },
      "agent": {
        "markdown": "Use this fact to choose the setup path."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "string",
        "enum": ["greenfield", "brownfield"]
      }
    }
  },
  {
    "key": "project_knowledge_directory",
    "name": "Project Knowledge Directory",
    "factType": "string",
    "cardinality": "one",
    "defaultValue": "docs",
    "description": {
      "markdown": "Directory where durable setup knowledge artifacts are stored."
    },
    "guidance": {
      "human": {
        "markdown": "Folder for setup-created knowledge artifacts."
      },
      "agent": {
        "markdown": "Use as the default output root for setup documentation."
      }
    },
    "validation": {
      "kind": "path",
      "path": {
        "pathKind": "directory",
        "normalization": { "trimWhitespace": true },
        "safety": { "disallowAbsolute": true, "preventTraversal": true }
      }
    }
  },
  {
    "key": "planning_artifacts_directory",
    "name": "Planning Artifacts Directory",
    "factType": "string",
    "cardinality": "one",
    "defaultValue": ".sisyphus",
    "description": {
      "markdown": "Directory for planning artifacts established during setup."
    },
    "guidance": {
      "human": {
        "markdown": "Use for setup-created planning artifacts."
      },
      "agent": {
        "markdown": "Prefer this for planning-oriented setup outputs unless a slot says otherwise."
      }
    },
    "validation": {
      "kind": "path",
      "path": {
        "pathKind": "directory",
        "normalization": { "trimWhitespace": true },
        "safety": { "disallowAbsolute": true, "preventTraversal": true }
      }
    }
  }
]
```

### `WU.SETUP` — Workflows

```json
[
  {
    "key": "generate_project_context",
    "displayName": "Generate Project Context",
    "description": {
      "markdown": "Support workflow for generating or refreshing durable project context during setup."
    },
    "metadata": {
      "family": "setup",
      "intent": "supporting_context_generation",
        "supports_modes": ["greenfield", "brownfield"],
        "bound_by_default": false
    },
    "guidance": {
      "human": {
        "markdown": "Use when setup needs to generate or refresh project context."
      },
      "agent": {
        "markdown": "Setup-owned support workflow; not transition-bound by default."
      }
    }
  },
  {
    "key": "setup_project",
    "displayName": "Setup Project",
    "description": {
      "markdown": "Primary setup workflow that establishes the baseline project context for downstream work."
    },
    "metadata": {
      "family": "setup",
      "intent": "primary_setup_completion",
        "supports_modes": ["greenfield", "brownfield"],
        "bound_by_default": true,
      "primary_transition_key": "activation_to_done"
    },
    "guidance": {
      "human": {
        "markdown": "Primary workflow for establishing the setup baseline."
      },
      "agent": {
        "markdown": "This is the completion-driving setup workflow."
      }
    }
  }
]
```

### `WU.SETUP` — States

```json
[
  {
    "key": "done",
    "displayName": "Done",
    "description": {
      "markdown": "Setup is complete and downstream work can rely on its established baseline."
    },
    "guidance": {
      "human": {
        "markdown": "This state means setup has produced the baseline context needed by later work units."
      },
      "agent": {
        "markdown": "Only treat setup as done when the required baseline setup facts have been captured."
      }
    }
  }
]
```

### `WU.SETUP` — Transition

```json
[
  {
    "transitionKey": "activation_to_done",
    "fromState": null,
    "toState": "done",
    "description": {
      "markdown": "Completes the setup work unit from initial activation into the done state."
    },
    "guidance": {
      "human": {
        "markdown": "This transition represents the full setup lifecycle from initial project activation to a ready baseline."
      },
      "agent": {
        "markdown": "Use this transition to enforce the shared setup completion requirements before downstream work begins."
      }
    }
  }
]
```

### `WU.SETUP` — Start Gate Condition Set

```json
[
  {
    "key": "wu.setup.activation_to_done.start",
    "phase": "start",
    "mode": "all",
    "groups": []
  }
]
```

### `WU.SETUP` — Completion Gate Condition Set

```json
[
  {
    "key": "wu.setup.activation_to_done.completion",
    "phase": "completion",
    "mode": "all",
    "groups": [
      {
        "key": "required_setup_facts",
        "mode": "all",
        "conditions": [
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "initiative_name",
              "operator": "exists"
            },
            "rationale": "Setup needs a canonical initiative name."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "project_kind",
              "operator": "exists"
            },
            "rationale": "Setup needs the greenfield/brownfield routing decision."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "project_knowledge_directory",
              "operator": "exists"
            },
            "rationale": "Setup needs a durable knowledge output directory."
          }
        ]
      }
    ]
  }
]
```

### `WU.SETUP` — Bound Workflows

```json
[
  {
    "transitionKey": "activation_to_done",
    "workflowKeys": ["setup_project"]
  }
]
```

- `generate_project_context` remains setup-owned but unbound.

### `WU.SETUP` — Artifact Slot

```json
[
  {
    "key": "setup_readme",
    "displayName": "Setup README",
    "description": {
      "markdown": "Durable setup artifact capturing baseline project context."
    },
    "guidance": {
      "human": {
        "markdown": "Use this artifact to summarize the setup baseline."
      },
      "agent": {
        "markdown": "Populate from supported template variables only."
      }
    },
    "cardinality": "single",
    "rules": {
      "pathStrategy": "project-root",
      "suggestedPath": "README.md",
      "templateEngine": "handlebars",
      "maxFiles": 1
    }
  }
]
```

### `WU.SETUP` — Artifact Template

```json
[
  {
    "key": "default",
    "displayName": "Default Setup README",
    "description": {
      "markdown": "Default README template for setup-created project baselines."
    },
    "guidance": {
      "human": {
        "markdown": "Keep this concise and durable."
      },
      "agent": {
        "markdown": "Use only supported template variable namespaces."
      }
    },
    "content": "# {{workUnit.facts.initiative_name}}\n\n## Project Setup\n- Kind: {{workUnit.facts.project_kind}}\n{{#if methodology.facts.project_root_directory}}- Project root: {{methodology.facts.project_root_directory}}\n{{/if}}{{#if workUnit.facts.project_knowledge_directory}}- Knowledge directory: {{workUnit.facts.project_knowledge_directory}}\n{{/if}}{{#if workUnit.facts.planning_artifacts_directory}}- Planning artifacts: {{workUnit.facts.planning_artifacts_directory}}\n{{/if}}"
  }
]
```

### `WU.SETUP` — Locked caveat

- If setup completion should later require `setup_readme`, that is a valid design intent, but it is not currently representable in the shipped state-machine condition model because artifact-based transition conditions are not yet supported.
- Setup template content now explicitly treats `project_root_directory` as runtime-optional and uses conditional fact rendering rather than assuming every fact is always populated.

## Locked Seed Snapshot (L2) — `WU.BRAINSTORMING`

### `WU.BRAINSTORMING` — Modeling notes

- `brainstorming` remains the only transition-bound completion workflow for this work unit.
- A curated Slice-A subset of advanced elicitation is modeled as **10 separate brainstorming-owned support workflows**, not as one umbrella workflow row.
- This is an intentional Chiron translation choice: BMAD source models these under `_bmad/core/workflows/advanced-elicitation/methods.csv` as methods within one support workflow, but for Chiron L2 we are elevating the selected subset into distinct work-unit-owned workflows.
- Those 10 support workflows remain **unbound** to `activation_to_done`.
- Because the currently shipped runtime evaluator does not yet enforce cross-work-unit state checks through referenced work-unit facts, the start gate is modeled using a fact-exists dependency on `setup_work_unit`, not a `work_unit state_is done` condition.
- Artifact-presence conditions are still unsupported, so completion is modeled with durable fact requirements rather than artifact checks.

### `WU.BRAINSTORMING` — Work-Unit Facts

```json
[
  {
    "key": "setup_work_unit",
    "name": "Setup Work Unit",
    "factType": "work unit",
    "cardinality": "one",
    "description": {
      "markdown": "Reference to the setup work unit that established the baseline project context for this brainstorming effort."
    },
    "guidance": {
      "human": {
        "markdown": "Select the setup work unit that provides the baseline project context."
      },
      "agent": {
        "markdown": "Use this reference to retrieve setup-established context before facilitating brainstorming."
      }
    },
    "validation": {
      "kind": "none",
      "dependencyType": "requires_setup_context",
      "workUnitKey": "setup"
    },
    "dependencyType": "requires_setup_context"
  },
  {
    "key": "objectives",
    "name": "Objectives",
    "factType": "json",
    "cardinality": "many",
    "description": {
      "markdown": "Structured set of goal-oriented objectives the brainstorming session is meant to explore."
    },
    "guidance": {
      "human": {
        "markdown": "Capture one or more explicit brainstorming objectives. Each objective should describe what the session is trying to explore or produce."
      },
      "agent": {
        "markdown": "Treat this as the canonical many-valued objective set that keeps divergence focused. Preserve insertion order by default; if stronger prioritization matters, store it explicitly inside each objective item."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "motivation", "success_signal"],
        "properties": {
          "title": { "type": "string", "cardinality": "one", "title": "Title" },
          "motivation": { "type": "string", "cardinality": "one", "title": "Motivation" },
          "success_signal": { "type": "string", "cardinality": "one", "title": "Success Signal" },
          "priority": { "type": "number", "cardinality": "one", "title": "Priority" },
          "notes": { "type": "string", "cardinality": "one", "title": "Notes" }
        }
      }
    }
  },
  {
    "key": "desired_outcome",
    "name": "Desired Outcome",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "What the session should produce when it has succeeded."
    },
    "guidance": {
      "human": {
        "markdown": "Describe the outcome the brainstorming session should deliver."
      },
      "agent": {
        "markdown": "Use this as the convergence target when deciding whether brainstorming is complete."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "key": "constraints",
    "name": "Constraints",
    "factType": "json",
    "cardinality": "one",
    "description": {
      "markdown": "Structured constraints that should shape the brainstorming session."
    },
    "guidance": {
      "human": {
        "markdown": "Capture any must-have constraints, must-avoid constraints, and timebox notes. String entries may contain markdown when richer authored text is useful."
      },
      "agent": {
        "markdown": "Honor these constraints while exploring options and converging on directions."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "must_have": {
            "type": "string",
            "cardinality": "many",
            "title": "Must Have"
          },
          "must_avoid": {
            "type": "string",
            "cardinality": "many",
            "title": "Must Avoid"
          },
          "timebox_notes": {
            "type": "string",
            "cardinality": "many",
            "title": "Timebox Notes"
          }
        }
      }
    }
  },
  {
    "key": "selected_directions",
    "name": "Selected Directions",
    "factType": "json",
    "cardinality": "one",
    "description": {
      "markdown": "Durable convergence checkpoint capturing the directions selected at the end of brainstorming."
    },
    "guidance": {
      "human": {
        "markdown": "Capture the selected directions as categorized lists: primary directions, quick wins, and breakthrough concepts."
      },
      "agent": {
        "markdown": "Persist the converged outputs here as categorized lists so downstream work can depend on them without parsing the full artifact."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "primary_directions": {
            "type": "string",
            "cardinality": "many",
            "title": "Primary Directions"
          },
          "quick_wins": {
            "type": "string",
            "cardinality": "many",
            "title": "Quick Wins"
          },
          "breakthrough_concepts": {
            "type": "string",
            "cardinality": "many",
            "title": "Breakthrough Concepts"
          }
        }
      }
    }
  }
]
```

### `WU.BRAINSTORMING` — Workflows

```json
[
  {
    "key": "brainstorming",
    "displayName": "Brainstorming",
    "description": {
      "markdown": "Primary brainstorming workflow for divergent exploration followed by convergence."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "primary_brainstorming_session",
        "supports_modes": ["new", "continue"],
        "bound_by_default": true,
        "primary_transition_key": "activation_to_done",
        "source_workflow": "brainstorming"
    },
    "guidance": {
      "human": {
        "markdown": "Primary brainstorming workflow for divergent exploration followed by convergence."
      },
      "agent": {
        "markdown": "Use this workflow to run the main facilitated brainstorming session and drive completion of the work unit."
      }
    }
  },
  {
    "key": "five_whys_deep_dive",
    "displayName": "5 Whys Deep Dive",
    "description": {
      "markdown": "Support workflow for layered root-cause exploration during brainstorming."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "five_whys_deep_dive",
        "source_method_category": "core"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session needs layered root-cause exploration."
      },
      "agent": {
        "markdown": "Support workflow only; deepen causality analysis without serving as the completion workflow."
      }
    }
  },
  {
    "key": "architecture_decision_records",
    "displayName": "Architecture Decision Records",
    "description": {
      "markdown": "Support workflow for comparing and documenting architectural options during brainstorming."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "architecture_decision_records",
        "source_method_category": "technical"
    },
    "guidance": {
      "human": {
        "markdown": "Use when brainstorming must compare and document architectural options."
      },
      "agent": {
        "markdown": "Support workflow only; use to structure architecture-option exploration and tradeoff capture."
      }
    }
  },
  {
    "key": "self_consistency_validation",
    "displayName": "Self-Consistency Validation",
    "description": {
      "markdown": "Support workflow for checking whether emerging directions remain internally consistent."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "self_consistency_validation",
        "source_method_category": "advanced"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session needs to pressure-test whether emerging directions remain internally consistent."
      },
      "agent": {
        "markdown": "Support workflow only; use to compare multiple reasoning paths and check alignment."
      }
    }
  },
  {
    "key": "first_principles_analysis",
    "displayName": "First Principles Analysis",
    "description": {
      "markdown": "Support workflow for stripping assumptions and rebuilding the problem from fundamentals."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "first_principles_analysis",
        "source_method_category": "core"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session should strip assumptions and rebuild the problem from fundamentals."
      },
      "agent": {
        "markdown": "Support workflow only; use to challenge default assumptions and reframe the problem from basics."
      }
    }
  },
  {
    "key": "socratic_questioning",
    "displayName": "Socratic Questioning",
    "description": {
      "markdown": "Support workflow for uncovering hidden assumptions through structured questioning."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "socratic_questioning",
        "source_method_category": "core"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session should uncover hidden assumptions through structured questioning."
      },
      "agent": {
        "markdown": "Support workflow only; use targeted questioning to clarify intent, evidence, and tradeoffs."
      }
    }
  },
  {
    "key": "critique_and_refine",
    "displayName": "Critique and Refine",
    "description": {
      "markdown": "Support workflow for challenging and improving candidate directions before convergence."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "critique_and_refine",
        "source_method_category": "core"
    },
    "guidance": {
      "human": {
        "markdown": "Use when promising ideas need structured critique before convergence."
      },
      "agent": {
        "markdown": "Support workflow only; iteratively challenge and improve candidate directions."
      }
    }
  },
  {
    "key": "tree_of_thoughts",
    "displayName": "Tree of Thoughts",
    "description": {
      "markdown": "Support workflow for exploring branching candidate paths before choosing one."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "tree_of_thoughts",
        "source_method_category": "advanced"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session should branch through multiple candidate paths before choosing one."
      },
      "agent": {
        "markdown": "Support workflow only; explore a branching decision tree of possible approaches."
      }
    }
  },
  {
    "key": "graph_of_thoughts",
    "displayName": "Graph of Thoughts",
    "description": {
      "markdown": "Support workflow for mapping non-linear relationships across ideas and concepts."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "graph_of_thoughts",
        "source_method_category": "advanced"
    },
    "guidance": {
      "human": {
        "markdown": "Use when ideas should be connected across multiple non-linear relationships."
      },
      "agent": {
        "markdown": "Support workflow only; map interconnected concepts rather than a single linear chain."
      }
    }
  },
  {
    "key": "meta_prompting_analysis",
    "displayName": "Meta-Prompting Analysis",
    "description": {
      "markdown": "Support workflow for examining the framing and prompting strategy used during brainstorming."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "meta_prompting_analysis",
        "source_method_category": "advanced"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the team wants to examine the framing and prompting strategy itself."
      },
      "agent": {
        "markdown": "Support workflow only; analyze whether the prompts, frames, or lenses used in brainstorming are helping or distorting exploration."
      }
    }
  },
  {
    "key": "stakeholder_round_table",
    "displayName": "Stakeholder Round Table",
    "description": {
      "markdown": "Support workflow for comparing or simulating multiple stakeholder viewpoints during brainstorming."
    },
    "metadata": {
      "family": "brainstorming",
      "intent": "supporting_elicitation_method",
        "supports_modes": ["enhancement"],
        "bound_by_default": false,
      "source_workflow": "advanced_elicitation",
      "source_method_key": "stakeholder_round_table",
        "source_method_category": "collaboration"
    },
    "guidance": {
      "human": {
        "markdown": "Use when the session should explicitly compare or simulate multiple stakeholder viewpoints."
      },
      "agent": {
        "markdown": "Support workflow only; structure the discussion as a multi-perspective round-table rather than a single-agent brainstorm."
      }
    }
  }
]
```

### `WU.BRAINSTORMING` — States

```json
[
  {
    "key": "done",
    "displayName": "Done",
    "description": {
      "markdown": "Brainstorming is complete and its converged directions can inform downstream research and planning."
    },
    "guidance": {
      "human": {
        "markdown": "This state means the brainstorming session has produced durable converged directions suitable for downstream use."
      },
      "agent": {
        "markdown": "Only treat brainstorming as done when the session objective, desired outcome, and selected directions have been recorded."
      }
    }
  }
]
```

### `WU.BRAINSTORMING` — Transition

```json
[
  {
    "transitionKey": "activation_to_done",
    "fromState": null,
    "toState": "done",
    "description": {
      "markdown": "Completes a brainstorming work unit from initial activation into the done state."
    },
    "guidance": {
      "human": {
        "markdown": "This transition covers the full lifecycle of a brainstorming effort from initial context linkage through convergence."
      },
      "agent": {
        "markdown": "Use this transition only for the primary brainstorming workflow; support elicitation workflows remain work-unit-owned but unbound."
      }
    }
  }
]
```

### `WU.BRAINSTORMING` — Start Gate Condition Set

```json
[
  {
    "key": "wu.brainstorming.activation_to_done.start",
    "phase": "start",
    "mode": "all",
    "groups": [
      {
        "key": "requires_setup_reference",
        "mode": "all",
        "conditions": [
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "setup_work_unit",
              "operator": "exists"
            },
            "rationale": "Brainstorming must reference the setup work unit that established baseline context."
          }
        ]
      }
    ]
  }
]
```

### `WU.BRAINSTORMING` — Completion Gate Condition Set

```json
[
  {
    "key": "wu.brainstorming.activation_to_done.completion",
    "phase": "completion",
    "mode": "all",
    "groups": [
      {
        "key": "required_brainstorming_facts",
        "mode": "all",
        "conditions": [
          {
            "kind": "fact",
            "required": true,
            "config": {
            "factKey": "objectives",
            "operator": "exists"
          },
          "rationale": "Brainstorming needs at least one recorded objective."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "desired_outcome",
              "operator": "exists"
            },
            "rationale": "Brainstorming needs an explicit notion of success."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "selected_directions",
              "operator": "exists"
            },
            "rationale": "Brainstorming should converge on durable selected directions before completion."
          }
        ]
      }
    ]
  }
]
```

### `WU.BRAINSTORMING` — Bound Workflows

```json
[
  {
    "transitionKey": "activation_to_done",
    "workflowKeys": ["brainstorming"]
  }
]
```

- The 10 advanced_elicitation-derived workflows listed above are brainstorming-owned support workflows and remain unbound.

### `WU.BRAINSTORMING` — Artifact Slot

```json
[
  {
    "key": "brainstorming_session",
    "displayName": "Brainstorming Session",
    "description": {
      "markdown": "Durable brainstorming artifact capturing the facilitated session, constraints, and converged directions."
    },
    "guidance": {
      "human": {
        "markdown": "Use this artifact to persist the full brainstorming session outcome."
      },
      "agent": {
        "markdown": "Persist the durable session narrative here; downstream work may use `selected_directions` for fast gating and this artifact for fuller context."
      }
    },
    "cardinality": "single",
    "rules": {
      "pathStrategy": "project-knowledge",
      "suggestedPath": "brainstorming/brainstorming-session.md",
      "templateEngine": "handlebars",
      "maxFiles": 1
    }
  }
]
```

### `WU.BRAINSTORMING` — Artifact Template

```json
[
  {
    "key": "default",
    "displayName": "Default Brainstorming Session Template",
    "description": {
      "markdown": "Default template for the durable brainstorming session artifact."
    },
    "guidance": {
      "human": {
        "markdown": "Summarize the setup context, objective, constraints, and selected directions."
      },
      "agent": {
        "markdown": "Use only supported template variable namespaces and keep the artifact durable rather than ephemeral."
      }
    },
    "content": "# Brainstorming Session\n\n## Context\n{{#if methodology.workUnits.setup.facts.initiative_name}}- Initiative: {{methodology.workUnits.setup.facts.initiative_name}}\n{{/if}}- Desired outcome: {{workUnit.facts.desired_outcome}}\n\n{{#if workUnit.facts.objectives}}## Objectives\n{{#each workUnit.facts.objectives}}- {{title}}: {{motivation}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}{{/if}}{{#if workUnit.facts.constraints}}## Constraints\n{{#if workUnit.facts.constraints.must_have}}- Must have: {{workUnit.facts.constraints.must_have}}\n{{/if}}{{#if workUnit.facts.constraints.must_avoid}}- Must avoid: {{workUnit.facts.constraints.must_avoid}}\n{{/if}}{{#if workUnit.facts.constraints.timebox_notes}}- Timebox notes: {{workUnit.facts.constraints.timebox_notes}}\n{{/if}}\n{{/if}}{{#if workUnit.facts.selected_directions}}## Selected Directions\n{{#if workUnit.facts.selected_directions.primary_directions}}- Primary directions: {{workUnit.facts.selected_directions.primary_directions}}\n{{/if}}{{#if workUnit.facts.selected_directions.quick_wins}}- Quick wins: {{workUnit.facts.selected_directions.quick_wins}}\n{{/if}}{{#if workUnit.facts.selected_directions.breakthrough_concepts}}- Breakthrough concepts: {{workUnit.facts.selected_directions.breakthrough_concepts}}\n{{/if}}{{/if}}"
  }
]
```

### `WU.BRAINSTORMING` — Locked caveats

- The selected 10 `advanced_elicitation`-derived workflows are a deliberate Slice-A subset of BMAD’s broader `methods.csv` registry; the remaining methods stay lineage-only for now.
- If brainstorming completion should later require the presence of `brainstorming_session`, that remains a valid design goal but is not currently representable in the shipped transition-condition model because artifact-based conditions are unsupported.
- If the runtime later gains true cross-work-unit state evaluation for referenced work-unit facts, the start gate can be tightened from `setup_work_unit exists` to an explicit setup-state dependency.

## Locked Seed Snapshot (L2) — `WU.RESEARCH`

### `WU.RESEARCH` — Modeling notes

- `research` is modeled as one work unit with three primary workflows: `market_research`, `domain_research`, and `technical_research`.
- All three research workflows are bound to the same `activation_to_done` transition.
- The chosen workflow carries the research flavor; `research_type` therefore remains workflow metadata rather than a separate work-unit fact.
- Start gating is currently modeled via fact existence on referenced upstream work units (`setup_work_unit`, `brainstorming_work_unit`) rather than explicit cross-work-unit state evaluation.
- Completion is currently modeled via durable fact requirements rather than artifact-presence checks because artifact-based conditions are not yet supported.
- Locked target shape for this draft: work-unit facts, states, workflows, artifact slots/templates, and transitions carry both `description` and `guidance`; condition sets and transition bindings carry neither.

### `WU.RESEARCH` — Work-Unit Facts

```json
[
  {
    "key": "setup_work_unit",
    "name": "Setup Work Unit",
    "factType": "work unit",
    "cardinality": "one",
    "description": {
      "markdown": "Reference to the setup work unit that established baseline project context."
    },
    "guidance": {
      "human": {
        "markdown": "Select the setup work unit whose baseline context should be used for this research effort."
      },
      "agent": {
        "markdown": "Use the referenced setup work unit as the authoritative source of baseline project context."
      }
    },
    "validation": {
      "kind": "none",
      "dependencyType": "requires_setup_context",
      "workUnitKey": "setup"
    }
  },
  {
    "key": "brainstorming_work_unit",
    "name": "Brainstorming Work Unit",
    "factType": "work unit",
    "cardinality": "one",
    "description": {
      "markdown": "Reference to the brainstorming work unit that shaped the research direction."
    },
    "guidance": {
      "human": {
        "markdown": "Select the brainstorming work unit whose outcomes should inform this research."
      },
      "agent": {
        "markdown": "Use the referenced brainstorming work unit to recover the ideas or direction that motivated this research."
      }
    },
    "validation": {
      "kind": "none",
      "dependencyType": "informed_by_brainstorming",
      "workUnitKey": "brainstorming"
    }
  },
  {
    "key": "research_topic",
    "name": "Research Topic",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "The core topic, question, or subject being researched."
    },
    "guidance": {
      "human": {
        "markdown": "State the specific topic this research should investigate."
      },
      "agent": {
        "markdown": "Treat this as the primary anchor for research framing, source selection, and synthesis."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "key": "research_goals",
    "name": "Research Goals",
    "factType": "json",
    "cardinality": "many",
    "description": {
      "markdown": "Structured set of concrete research goals the workflow must answer or produce."
    },
    "guidance": {
      "human": {
        "markdown": "Capture one or more explicit research goals. Each goal should state what the research must clarify, compare, verify, or recommend."
      },
      "agent": {
        "markdown": "Use this many-valued goal set to bound scope and decide whether the research is complete. Preserve insertion order by default; if stronger prioritization matters, store it explicitly inside each goal item."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "question", "success_signal"],
        "properties": {
          "title": { "type": "string", "cardinality": "one", "title": "Title" },
          "question": { "type": "string", "cardinality": "one", "title": "Question" },
          "success_signal": { "type": "string", "cardinality": "one", "title": "Success Signal" },
          "priority": { "type": "number", "cardinality": "one", "title": "Priority" },
          "notes": { "type": "string", "cardinality": "one", "title": "Notes" }
        }
      }
    }
  },
  {
    "key": "scope_notes",
    "name": "Scope Notes",
    "factType": "string",
    "cardinality": "one",
    "description": {
      "markdown": "Optional notes that narrow, qualify, or constrain the research scope."
    },
    "guidance": {
      "human": {
        "markdown": "Use this for exclusions, audience framing, or scope constraints."
      },
      "agent": {
        "markdown": "Honor these notes when selecting sources and synthesizing findings."
      }
    },
    "validation": { "kind": "none" }
  },
  {
    "key": "research_synthesis",
    "name": "Research Synthesis",
    "factType": "json",
    "cardinality": "one",
    "description": {
      "markdown": "Compact durable summary of the completed research conclusions."
    },
    "guidance": {
      "human": {
        "markdown": "Capture the most important conclusions in a compact structured form for downstream use."
      },
      "agent": {
        "markdown": "Persist the minimum durable synthesis needed to support downstream planning and implementation decisions."
      }
    },
    "validation": {
      "kind": "json-schema",
      "schemaDialect": "draft-2020-12",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "executive_summary",
          "key_finding",
          "primary_recommendation"
        ],
        "properties": {
          "executive_summary": { "type": "string", "cardinality": "one", "title": "Executive Summary" },
              "key_finding": { "type": "string", "cardinality": "one", "title": "Key Finding" },
              "primary_recommendation": { "type": "string", "cardinality": "one", "title": "Primary Recommendation" },
              "source_verification_summary": { "type": "string", "cardinality": "one", "title": "Source Verification Summary" }
        }
      }
    }
  }
]
```

### `WU.RESEARCH` — Workflows

```json
[
  {
    "key": "market_research",
    "displayName": "Market Research",
    "description": {
      "markdown": "Research workflow for market landscape, competitors, positioning, and demand."
    },
    "guidance": {
      "human": {
        "markdown": "Use this workflow when the question is primarily about market opportunity, competition, audience demand, or positioning."
      },
      "agent": {
        "markdown": "Produce a market-focused report grounded in verified sources and explicit synthesis."
      }
    },
    "metadata": {
      "family": "research",
        "research_type": "market",
        "intent": "market_analysis",
        "bound_by_default": true
    }
  },
  {
    "key": "domain_research",
    "displayName": "Domain Research",
    "description": {
      "markdown": "Research workflow for domain language, actors, concepts, and operational context."
    },
    "guidance": {
      "human": {
        "markdown": "Use this workflow when the question is primarily about understanding the domain itself."
      },
      "agent": {
        "markdown": "Produce a domain-focused report that clarifies concepts, terminology, actors, and constraints."
      }
    },
    "metadata": {
      "family": "research",
        "research_type": "domain",
        "intent": "domain_analysis",
        "bound_by_default": true
    }
  },
  {
    "key": "technical_research",
    "displayName": "Technical Research",
    "description": {
      "markdown": "Research workflow for technical options, architecture, implementation tradeoffs, and tooling."
    },
    "guidance": {
      "human": {
        "markdown": "Use this workflow when the question is primarily about technical approach or implementation choices."
      },
      "agent": {
        "markdown": "Produce a technical report that compares options, identifies constraints, and supports engineering decisions."
      }
    },
    "metadata": {
      "family": "research",
        "research_type": "technical",
        "intent": "technical_analysis",
        "bound_by_default": true
    }
  }
]
```

### `WU.RESEARCH` — States

```json
[
  {
    "key": "done",
    "displayName": "Done",
    "description": {
      "markdown": "Research is complete and its synthesized conclusions are available for downstream work."
    },
    "guidance": {
      "human": {
        "markdown": "This state means the research has been completed to a level suitable for later planning or implementation work."
      },
      "agent": {
        "markdown": "Only treat research as done when the durable synthesis has been captured and the workflow objective has been satisfied."
      }
    }
  }
]
```

### `WU.RESEARCH` — Transition

```json
[
  {
    "transitionKey": "activation_to_done",
    "fromState": null,
    "toState": "done",
    "description": {
      "markdown": "Completes a research work unit from initial activation into the done state."
    },
    "guidance": {
      "human": {
        "markdown": "This transition covers the full lifecycle of a single research effort from start through finalized synthesis."
      },
      "agent": {
        "markdown": "Use this transition for all three research workflows; the chosen workflow determines the research type while the transition enforces shared completion requirements."
      }
    }
  }
]
```

### `WU.RESEARCH` — Start Gate Condition Set

```json
[
  {
    "key": "wu.research.activation_to_done.start",
    "phase": "start",
    "mode": "all",
    "groups": [
      {
        "key": "required_upstream_context",
        "conditions": [
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "setup_work_unit",
              "operator": "exists"
            },
            "rationale": "Research requires a setup context reference."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "brainstorming_work_unit",
              "operator": "exists"
            },
            "rationale": "Research should be connected to an upstream brainstorming context."
          }
        ]
      }
    ]
  }
]
```

### `WU.RESEARCH` — Completion Gate Condition Set

```json
[
  {
    "key": "wu.research.activation_to_done.completion",
    "phase": "completion",
    "mode": "all",
    "groups": [
      {
        "key": "required_research_outputs",
        "conditions": [
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "research_topic",
              "operator": "exists"
            },
            "rationale": "The research topic must be recorded."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "research_goals",
              "operator": "exists"
            },
          "rationale": "The research goals set must include at least one recorded goal."
          },
          {
            "kind": "fact",
            "required": true,
            "config": {
               "factKey": "research_synthesis",
              "operator": "exists"
            },
            "rationale": "A durable synthesis must exist before the research is complete."
          }
        ]
      }
    ]
  }
]
```

### `WU.RESEARCH` — Bound Workflows

```json
[
  {
    "transitionKey": "activation_to_done",
    "workflowKeys": [
      "market_research",
      "domain_research",
      "technical_research"
    ]
  }
]
```

### `WU.RESEARCH` — Artifact Slot

```json
[
  {
    "key": "research_report",
    "displayName": "Research Report",
    "description": {
      "markdown": "Durable report artifact produced by a research workflow."
    },
    "guidance": {
      "human": {
        "markdown": "Each research run should produce one final report tailored to the selected research workflow."
      },
      "agent": {
        "markdown": "Write the final synthesized research document here using the template that matches the active workflow."
      }
    },
    "cardinality": "single",
    "rules": {
      "pathStrategy": "planning-artifacts",
      "suggestedPath": "research/research-report.md",
      "templateEngine": "handlebars",
      "maxFiles": 1
    }
  }
]
```

### `WU.RESEARCH` — Artifact Templates

```json
[
  {
    "key": "market",
    "displayName": "Market Research Report",
    "description": {
      "markdown": "Template for durable market research output."
    },
    "guidance": {
      "human": {
        "markdown": "Use this template when the research focuses on market context, competition, and positioning."
      },
      "agent": {
        "markdown": "Produce a market-oriented report using the shared research facts and synthesis."
      }
    },
    "content": "# Market Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}"
  },
  {
    "key": "domain",
    "displayName": "Domain Research Report",
    "description": {
      "markdown": "Template for durable domain research output."
    },
    "guidance": {
      "human": {
        "markdown": "Use this template when the research focuses on domain concepts, terminology, actors, and context."
      },
      "agent": {
        "markdown": "Produce a domain-oriented report using the shared research facts and synthesis."
      }
    },
    "content": "# Domain Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}"
  },
  {
    "key": "technical",
    "displayName": "Technical Research Report",
    "description": {
      "markdown": "Template for durable technical research output."
    },
    "guidance": {
      "human": {
        "markdown": "Use this template when the research focuses on technical options, architecture, tooling, or tradeoffs."
      },
      "agent": {
        "markdown": "Produce a technical report using the shared research facts and synthesis."
      }
    },
    "content": "# Technical Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}"
  }
]
```

### `WU.RESEARCH` — Locked caveats

- `research_type` remains workflow metadata rather than a separate fact because the chosen workflow carries that meaning.
- `pathStrategy: "planning-artifacts"` is a locked convention for this seed design, not a currently frontend-enforced enum.
- Template dereferencing intentionally avoids walking from a referenced brainstorming work-unit fact into that exact instance’s facts because the current variable surface does not clearly express that indirection.
- If research completion should later require the presence of `research_report`, that remains a valid design goal but is not currently representable in the shipped transition-condition model because artifact-based conditions are unsupported.
