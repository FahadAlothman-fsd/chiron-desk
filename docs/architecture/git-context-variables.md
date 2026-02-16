# Git Context Variables

**Last Updated:** 2026-02-09  
**Status:** Draft baseline

## Goal

Treat git state as first-class workflow context without forcing a rigid branch orchestration model.

## Canonical Variable Keys

- `git.currentBranch`
- `git.headSha`
- `git.baseBranch`
- `git.upstream`
- `git.isDirty`
- `git.worktreePath`
- `git.lastAction`
- `git.lastActionResult`
- `git.previousBranch`
- `git.createdBranch`

## Update Triggers

- After any git-related action step (`checkout`, `branch`, `merge`, `commit`, `rebase`, `push`, `pull`).
- On execution start (initial snapshot).
- On explicit refresh action.

## Rules

- Variables must reflect observed git state, not assumed intent.
- Failed actions still update `git.lastActionResult`.
- Workflows branch logic should consume these variables for guardrails.

## Integration

- Produced by tooling-engine git action handlers.
- Stored through variable-service.
- Emitted as variable-change events on event-bus.
