# @chiron/ax-engine

Prompt optimization module (planned) using `@ax-llm/ax` as a DSPy-style optimization framework for TypeScript.

## What This Package Contains

- `src/index.ts` - scaffold export

## Intended Scope

- Signature registry for optimizable prompts
- Optimization runs and scoring workflows
- Integration with provider/model selection and template composition

## Phase 1 Scope (Locked)

- AX is used through the `ax-generation` tool path in runtime workflows.
- Invocation path: `@chiron/agent-runtime` -> `@chiron/tooling-engine` -> `@chiron/ax-engine`.
- Outputs are staged recommendations; no auto-apply.

## Locked Baseline

- Manual-first optimization triggers for MVP
- Recommendation output is staged (not auto-applied)
- Promotion requires explicit approval and rollback path

## Optimizer Profiles (Phase 1)

- `mipro`: default for single-objective optimization (commonly classification/constrained extraction); requires metric + training examples for optimization runs
- `gepa`: default for multi-objective balancing (quality/cost/latency)

`ace` is deferred from phase 1 pending dedicated agent-loop integration design.

Prototype-only optimizer types (`opro`, `promptbreeder`) are not in MVP scope.

## Service Boundaries (Target)

- `AxRegistry`: signatures and variants
- `AxResolver`: datasets/context/template references
- `AxOptimizer`: optimization execution
- `AxEngine`: orchestration facade

## Current State

- Scaffold only
- Related groundwork exists in DB schema (`optimization` tables) and prototype work outside this package
