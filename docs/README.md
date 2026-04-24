# Chiron Internal Documentation Index

**Last Updated:** 2026-04-23  
**Status:** Active internal index

## Boundary Rule

`docs/**` is the internal documentation tree.

- Public docs live in `apps/docs`.
- Public docs may link into `docs/**` as advanced resources for contributors and evaluators.
- Internal docs do not get mirrored wholesale into public-site navigation.
- Root `README.md` may link a small set of internal advanced resources, but those links stay outside public-site navigation.

Use this index to decide three things fast:

1. which internal docs are current canon
2. which docs are internal advanced resources that may be linked from public docs or the root `README.md`
3. which docs are archive-only or contextual history

## How To Route Work

Start here, then narrow down:

1. `docs/architecture/epic-3-authority.md` for routing, promotion status, and precedence
2. `docs/architecture/chiron-module-structure.md` for system boundaries and layer model
3. `docs/architecture/methodology-pages/**` for promoted design-time surface behavior
4. code and contracts for exact shipped behavior when docs and implementation need reconciliation

## Canonical Internal Docs

These stay in `docs/**` as the canonical in-repo source. They are discoverable from this index. Public docs may link to them as advanced resources, but they should not become first-class public navigation pages.

| Path                                                                         | Status       | Public surfacing rule                                                                                  | Notes                                                                     |
| ---------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `docs/architecture/epic-3-authority.md`                                      | Canon        | Linkable advanced resource from public docs and root `README.md`                                       | Routing authority for promoted Epic 3 surfaces.                           |
| `docs/architecture/chiron-module-structure.md`                               | Canon        | Linkable advanced resource from public docs and root `README.md`                                       | Best internal entry for module boundaries and layer ownership.            |
| `docs/architecture/methodology-canonical-authority.md`                       | Canon        | Linkable advanced resource from public docs when authority details matter                              | Canonical storage and methodology definition ownership.                   |
| `docs/architecture/methodology-pages/**`                                     | Canon        | Link from relevant public design-time pages as advanced resources, exclude from nav mirroring          | Promoted design-time page specs.                                          |
| `docs/architecture/modules/README.md`                                        | Canon        | Linkable advanced resource from root `README.md`, exclude from public nav                              | Index for module design docs.                                             |
| `docs/architecture/modules/*.md`                                             | Canon        | Link from `docs/architecture/modules/README.md` or targeted public pages only, exclude from public nav | Detailed module docs, often ahead of repo reality in scaffold-only areas. |
| `docs/architecture/system-pages/**`                                          | Canon        | Link from relevant advanced pages only, exclude from public nav                                        | Durable internal specs for system-owned surfaces.                         |
| `docs/architecture/ux-patterns/*.md`                                         | Canon        | Internal-only by default, link only when a contributor needs the exact pattern spec                    | Shared UI behavior rules, not primary public teaching content.            |
| `docs/plans/2026-03-19-methodology-design-runtime-boundary-refactor-plan.md` | Canon record | Link from internal references only, not public nav                                                     | Implemented boundary refactor record and verification evidence.           |

## Internal Advanced Resources, Linkable But Not Public Navigation

These are valid to reference from public docs, the root `README.md`, or the public docs plan as advanced resources. They stay internal and do not become mirrored public pages.

- `docs/architecture/epic-3-authority.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/methodology-pages/**`
- `docs/architecture/modules/README.md`
- `docs/architecture/modules/*.md`
- `docs/architecture/system-pages/**`

When a public page needs to go deeper, link to these as advanced resources with plain framing such as "Internal architecture reference" or "Advanced contributor reference".

## Contextual Internal Docs

These stay in the repo and may still help contributors, but they are not the first routing target for public docs.

- `docs/architecture/workflow-engine/workflow-paths.md`
- `docs/architecture/workflow-engine/effectful-design.md`
- `docs/architecture/module-inventory.md`
- `docs/architecture/module-implementation-workflow.md`
- `docs/architecture/module-observability-contract.md`
- `docs/architecture/workflow-engine-parity-checklist.md`
- `docs/architecture/contracts-effect-migration-checklist.md`
- `docs/architecture/tooling-engine-permission-parity-checklist.md`
- `docs/architecture/workflow-versioning.md`
- `docs/architecture/git-context-variables.md`
- `docs/architecture/branching-strategy.md`
- `docs/architecture/frontend-better-result-guidelines.md`
- `docs/architecture/workflow-diagram-ui-react-flow.md`
- `docs/architecture/pm-workflow-artifact-bridge-consideration.md`
- `docs/architecture/bmad-e2e-workflow-notes.md`

Use these as internal support material. Link them from public docs only when a contributor needs deeper implementation context.

## Archive-Only And Historical Material

These are preserved for lineage, thesis traceability, or historical context. Do not use them as current implementation truth.

### Archived paths

- `docs/archive/pre-epic-1-restart/`
- `docs/archive/phase-1-discovery/`
- `docs/archive/phase-3-solutioning/`
- `docs/archive/epic-1/`
- `docs/archive/epics-v1-mastra-era/`
- `docs/archive/story-1-6-handoffs/`

### Historical or superseded docs still in active paths

- `docs/schema-design.md`
- `docs/migration-plan.md`
- `docs/tech-specs/artifact-system.md`
- `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md`
- `docs/architecture/workflow-engine/agent-continuation-contract.md`
- `docs/architecture/project-context-only-bmad-mapping-draft.md`
- `docs/architecture/bmad-e2e-rigorous-example.md`

## README Link Set, Excluded From Public Navigation

If the root `README.md` needs a short internal-docs section, keep it to this set:

- `docs/README.md`
- `docs/architecture/epic-3-authority.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/modules/README.md`

That keeps internal docs discoverable without turning the public docs site into a mirror of the repo docs tree.

## Alignment Rules

- Public docs summarize concepts and operator-facing behavior, then link to internal docs as advanced resources when deeper detail helps.
- Internal docs remain canonical in `docs/**`.
- Code and contracts win when describing exact shipped behavior.
- Archive obsolete docs, do not delete them.
- Do not publish `docs/architecture/**` wholesale into public navigation.
