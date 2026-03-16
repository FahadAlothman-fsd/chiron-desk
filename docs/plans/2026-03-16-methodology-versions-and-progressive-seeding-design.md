# Methodology Versions And Progressive Seeding Design

## Goal

Align the documentation and active seed truth with what Chiron is actually doing now: methodology-owned Versions as the umbrella surface, a narrow `WU.SETUP`-only active seed slice, and an explicit progressive seeding process that grows slice by slice as implementation lands.

## Problem

The documentation cleanup and workflow-editor re-home are largely correct, but three gaps remain:

- there is no stable architecture doc for the Methodology `Versions` page even though the IA already treats it as a methodology-owned top-level surface;
- the broad legacy seed artifacts still exist and still imply a giant methodology-wide seed model that no longer matches current implementation reality;
- the repo does not yet document the actual seed policy the team wants to follow: start narrow, map one implemented BMAD slice into Chiron structures, validate it, then append the next slice later.

Those gaps create a new split-brain state: the page model is modernized, but seed truth and methodology navigation still point partly at an older worldview.

## Approved Direction

### Page model

Keep the accepted view model:

- `system` owns app-level pages such as `projects`, `methodologies`, `harnesses`, and `settings`;
- `methodology` owns design-time authoring pages such as Versions, Work Units, Methodology Facts, Agents, Dependency Definitions, and the Workflow Editor;
- `project` remains acknowledged but intentionally not locked yet.

### Methodology Versions

Add a stable Methodology `Versions` page doc under `docs/architecture/methodology-pages/` and treat it as the umbrella page for version-scoped methodology authoring.

That page should define:

- the versions ledger/list view at `/methodologies/:methodologyId/versions`;
- how a selected version routes into the version-scoped methodology surfaces;
- the relationship between methodology-level pages and version-owned pages;
- the fact that Work Units, Facts, and Workflow Editor work are version-scoped beneath this page.

### Seed truth

The two broad JSON seed artifacts are no longer the active working model:

- `/_bmad-output/planning-artifacts/chiron-seed-workflow-definitions-v1.json`
- `/_bmad-output/planning-artifacts/chiron-seed-transition-allowed-workflows-v1.json`

They should be archived or explicitly demoted to lineage-only reference.

The active seed truth should instead become the narrow slice the team is actually following now:

- `WU.SETUP` is the only active seed slice;
- `WU.PROJECT_CONTEXT` becomes historical transition context only;
- the active seed is defined by current code/docs, not by the old broad JSON payloads.

### Progressive seeding rule

Document the process as append-only and slice-first:

1. choose one implemented slice;
2. read and digest the corresponding BMAD workflow(s);
3. map that slice into Chiron structures (`work units`, `transitions`, `artifacts/slots`, `workflows`, `steps`, `agents`);
4. seed only that slice into the active canonical tables/fixtures;
5. validate the slice end to end;
6. append the next slice later.

This should become the explicit rule for future seed growth.

## Recommended Architecture Changes

### New durable docs

- `docs/architecture/methodology-pages/versions.md`
- `docs/architecture/methodology-progressive-seeding.md`

### Existing docs to update

- `docs/architecture/epic-3-authority.md`
- `docs/README.md`
- `docs/architecture/methodology-bmad-setup-mapping.md`
- `docs/architecture/module-inventory.md` if it still implies design-time workflow docs live under `workflow-engine/`
- `/_bmad-output/planning-artifacts/epics.md` if it still phrases design-time implementation as `workflow-engine` scoped instead of methodology/workflow-editor scoped

### Active code/seed truth to update

- `packages/scripts/src/story-seed-fixtures.ts`
- `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- `packages/scripts/src/seed/methodology/index.ts`
- related tests under `packages/scripts/src/tests/seeding/`

## WU.SETUP Cutover

The `WU.SETUP` cutover should be explicit, not partial.

That means:

- rename project-context-only seed language in active fixtures and seed metadata to setup-oriented language;
- ensure the active methodology version id, work unit key, workflow keys, and seed slice metadata all describe the setup slice rather than project-context-only onboarding;
- keep `WU.PROJECT_CONTEXT` references only where they are intentionally historical, transitional, or already documented as contextual/non-canonical.

## Archive Policy For The Legacy Seed JSONs

Do not leave the two broad JSON seed files in root active-planning truth if the active seed is now `WU.SETUP` only.

Preferred handling:

1. move both JSON files under `/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/`;
2. update active docs that still cite them as current source inputs;
3. if needed, preserve them only as lineage/reference for how the earlier broad seed model worked.

## Runtime-Only Meaning Of `workflow-engine`

After the re-home, `docs/architecture/workflow-engine/` should mean runtime/technical docs only.

Any remaining wording that still frames `workflow-engine/` as a design-time page bucket should be corrected so the folder semantics stay honest.

## Success Criteria

This design is successful when:

- Methodology `Versions` has a stable architecture page;
- the active seed truth is explicitly `WU.SETUP` only;
- the two broad legacy seed JSONs are no longer treated as current seed authority;
- the progressive seeding process is written down as an explicit rule;
- `workflow-engine/` reads as runtime/technical only across active docs;
- a new engineer can tell the difference between active seed truth, historical seed lineage, and future slices that have not been appended yet.
