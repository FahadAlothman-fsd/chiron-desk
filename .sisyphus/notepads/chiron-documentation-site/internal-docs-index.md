# Chiron Internal Docs Catalog

## Purpose

Working catalog for the internal docs boundary.

Public docs may link to selected items here as advanced resources. They do not mirror this tree into public-site navigation.

## Canon, Linkable Advanced Resources

| Path                                                   | Classification       | Public surfacing                                                             | Why it stays internal                                         |
| ------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `docs/README.md`                                       | Canon internal index | Link from root `README.md` and public `/reference/internal-docs` style pages | Internal router for the repo docs tree.                       |
| `docs/architecture/epic-3-authority.md`                | Canon                | Linkable advanced resource                                                   | Routes promoted Epic 3 docs and precedence.                   |
| `docs/architecture/chiron-module-structure.md`         | Canon                | Linkable advanced resource                                                   | Internal architecture boundary and layer ownership.           |
| `docs/architecture/methodology-canonical-authority.md` | Canon                | Linkable advanced resource                                                   | Source-of-truth rules for methodology definition storage.     |
| `docs/architecture/methodology-pages/**`               | Canon                | Link from matching public design-time pages only                             | Detailed internal page specs, too deep for direct public nav. |
| `docs/architecture/modules/README.md`                  | Canon                | Linkable advanced resource from root `README.md`                             | Entry point for module design docs.                           |
| `docs/architecture/modules/*.md`                       | Canon                | Targeted advanced links only                                                 | Module-specific architecture and scaffold-era design detail.  |
| `docs/architecture/system-pages/**`                    | Canon                | Targeted advanced links only                                                 | Internal specs for system-owned pages.                        |

## Canon, Internal-Only By Default

| Path                                                     | Classification     | Public surfacing                             | Notes                                                 |
| -------------------------------------------------------- | ------------------ | -------------------------------------------- | ----------------------------------------------------- |
| `docs/architecture/ux-patterns/*.md`                     | Canon              | Usually no public link                       | Shared contributor implementation patterns.           |
| `docs/architecture/workflow-versioning.md`               | Contextual support | Link only when a page needs the exact policy | Not a top-level public teaching page.                 |
| `docs/architecture/git-context-variables.md`             | Contextual support | Link only when needed                        | Advanced implementation detail.                       |
| `docs/architecture/branching-strategy.md`                | Contextual support | Link only when needed                        | Contributor-facing policy doc.                        |
| `docs/architecture/frontend-better-result-guidelines.md` | Contextual support | Link only when needed                        | Internal frontend convention doc.                     |
| `docs/architecture/workflow-diagram-ui-react-flow.md`    | Contextual support | Link only when needed                        | Internal UI direction, not public nav content.        |
| `docs/architecture/module-implementation-workflow.md`    | Contextual support | Usually no public link                       | Contributor workflow aid.                             |
| `docs/architecture/module-observability-contract.md`     | Contextual support | Usually no public link                       | Observability contract for internal engineering work. |

## Archive-Only Or Historical

| Path                                                                  | Classification         | Rule                                                  |
| --------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `docs/archive/**`                                                     | Archive-only           | Preserve, do not use as implementation truth.         |
| `docs/schema-design.md`                                               | Historical, superseded | Keep for lineage only.                                |
| `docs/migration-plan.md`                                              | Historical, superseded | Keep for lineage only.                                |
| `docs/tech-specs/artifact-system.md`                                  | Historical, superseded | Keep for lineage only.                                |
| `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md` | Historical, superseded | Keep only as lineage for pre-lock invoke design.      |
| `docs/architecture/workflow-engine/agent-continuation-contract.md`    | Historical, contextual | Not current authority.                                |
| `docs/architecture/project-context-only-bmad-mapping-draft.md`        | Historical, contextual | BMAD lineage, not canonical Epic 3 authority.         |
| `docs/architecture/bmad-e2e-rigorous-example.md`                      | Historical, contextual | Example lineage, not current step-contract authority. |

## README Link Set

Recommended internal links for the root `README.md`, while still excluding these docs from public-site navigation:

- `docs/README.md`
- `docs/architecture/epic-3-authority.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/modules/README.md`

## Public Plan Alignment

- Public inventory already treats internal docs as advanced resources, not mirrored public pages.
- The internal boundary should stay explicit in any future public docs plan updates.
- If a public page cites an internal doc, the link should be framed as an advanced contributor reference.
