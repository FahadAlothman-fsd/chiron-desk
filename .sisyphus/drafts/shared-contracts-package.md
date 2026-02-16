# Draft: Shared Contracts Package

> **STATUS: COMPLETED** — This work has been implemented. Kept for historical reference.

## Requirements (confirmed)
- "Add shared contracts package to prevent circular deps."
- "Provide minimal steps: create packages/contracts with package.json/tsconfig/tsdown/src/index.ts"
- "update docs/architecture/chiron-module-structure.md to include contracts module and dependency guidance."
- "No code edits, no tests. Return concise checklist."

## Technical Decisions
- Pending: package name, build tooling details, dependency rules wording.

## Research Findings
- Pending: codebase patterns for packages and docs conventions.

## Open Questions
- Confirm package naming conventions (e.g., @chiron/contracts?)
- Confirm tsdown config pattern and output target (ESM/CJS) based on repo norms
- Confirm dependency guidance wording and scope

## Scope Boundaries
- INCLUDE: new `packages/contracts/` scaffolding and docs update.
- EXCLUDE: application code changes, imports, tests, or behavior changes.
