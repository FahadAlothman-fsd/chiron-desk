# Branching Strategy (Workflow + Git)

**Last Updated:** 2026-02-09  
**Status:** Draft baseline

## Decision Direction

- Do not force a strict branch-orchestration model yet.
- Treat git branch state as first-class context via `git.*` variables.
- Keep workflow-versioning separate from git branching.

## Why

- Users may run arbitrary git actions inside workflows.
- Over-constraining branch behavior can conflict with real-world git flows.
- Chiron should integrate with existing PM/dev tools, not replace them.

## Near-Term Model

- Workflow logic can branch on observed git context (`git.currentBranch`, `git.isDirty`, etc.).
- Git actions remain flexible and explicit.
- Execution records keep audit trail of git actions and resulting context.

## Later (Optional) Evolution

- Add explicit workflow branch lineage if needed for advanced execution graphing.
- Keep that additive and compatibility-safe with existing git-variable model.
