# @chiron/tooling-engine

Central side-effect execution engine for Chiron (planned primary integration point).

## What This Package Contains

- `src/index.ts` - scaffold export

## Current State

- Package scaffold is present
- Detailed implementation plan exists in `.sisyphus/drafts/tooling-engine-plan.md`

## Intended Scope

- Unified tool/action execution for agent-runtime and workflow-engine
- DB-backed permission/approval gateway
- OpenCode-inspired permission model (`allow | ask | deny`) with pattern rules and `once | always | reject` replies
- Side-effect adapters for git/files/variables/artifacts/snapshots
