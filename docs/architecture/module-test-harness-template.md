# Module Test Harness Template (Effect-First)

Use this template for every module. The goal is deterministic, isolated tests with Layer substitution.

## Purpose

- Reproduce bugs at module scope without booting the full app
- Swap dependencies with test layers
- Test time/retry/concurrency behavior deterministically

## Required Pattern

1. Public module API is a `Context.Tag`
2. Dependencies are consumed only via Tags
3. Runtime wiring is done with `Layer`
4. Tests provide test layers (fakes/stubs/in-memory)

## File Layout (Per Module)

```text
packages/<module>/
  src/
    services/
      <module-service>.ts
  test/
    harness.ts
    <module>.spec.ts
```

## Harness Template

```ts
import { Effect, Layer } from "effect"
import { TestContext } from "effect"

import { ModuleService } from "@chiron/<module>"
import { DepA, DepB } from "@chiron/<deps>"

const DepATest = Layer.succeed(DepA, {
  // deterministic fake behavior
})

const DepBTest = Layer.succeed(DepB, {
  // deterministic fake behavior
})

export const ModuleHarness = Layer.mergeAll(
  DepATest,
  DepBTest,
  // add module live layer last
)

export const runTest = <A, E>(effect: Effect.Effect<A, E, ModuleService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(ModuleHarness), Effect.provide(TestContext.TestContext)))
```

## Deterministic Time Template

```ts
import { Effect, TestClock } from "effect"

const program = Effect.gen(function* () {
  // start effect that uses sleep/retry/schedule
  // ...
  yield* TestClock.adjust("1 minute")
  // assert expected state
})
```

## Minimum Test Cases (Per Module)

1. **Happy path**: operation succeeds with expected output
2. **Decode failure**: invalid input fails at boundary
3. **Dependency failure**: downstream dependency error is surfaced correctly
4. **Timeout/retry path**: deterministic with `TestClock`
5. **Concurrency path**: no race or deadlock under parallel execution

## Workflow-Engine Specific Additions

- Step lifecycle: start -> complete events emitted
- Pause/resume behavior works with `requiresUserInput`
- Approval flow blocks and resumes via approval resolution
- Variable propagation across steps is correct

## Review Checklist (Before Merge)

- [ ] Module tests run without app/server boot
- [ ] All external dependencies replaced by test layers
- [ ] Time-based tests use `TestClock` (no real sleeps)
- [ ] Boundary decode failures are tested
- [ ] At least one failure-path test per public operation

## References

- Effect TestClock: https://effect.website/docs/testing/testclock/
- Effect Services & Layers: https://effect.website/docs/requirements-management/layers/
