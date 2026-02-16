# @chiron/variable-service

Variable resolution and scoped state module (planned extraction).

## What This Package Contains

- `src/index.ts` - scaffold export

## Current State

- Standalone package is scaffold-only
- Variable logic currently lives inline in `@chiron/workflow-engine` (`services/variable-service.ts`)

## Intended Scope

- Multi-scope variable model (project/execution/step)
- Template resolution helpers
- Merge/set/get operations with clear precedence rules
- Optional variable history and audit hooks
