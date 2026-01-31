# AX Module Prototype

This folder is a TypeScript-only prototype of the AX module. It mirrors the
planned module boundaries and supports AX signature field types and modifiers.

## Files
- `ax-types.ts`: Signature, field, and optimizer types.
- `ax-registry.ts`: Registry interface + in-memory stub.
- `ax-resolver.ts`: Input resolver stub (variable/context/system/db/template).
- `ax-engine.ts`: Engine stub with streaming hooks and provider interface.
- `ax-optimizer.ts`: Optimizer runner stub (MiPRO/GEPA/ACE/OPRO/PromptBreeder).
- `ax-examples.ts`: Examples store stub (in-memory).

## AX field support (per docs)
- Input-only media types: `image`, `audio`, `file`, `url`
- Output-only: `class` and `internal`
- Modifiers: `optional`, `array`, `cache` (input-only)
- Constraints: `min`, `max`, `email`, `url`, `date`, `datetime`, `regex`

This stub does not execute AX itself. It defines interfaces and placeholders so we
can wire the real implementation later.

## Demo
Run the in-memory demo (no env needed):

```bash
bun "apps/server/prototyping/ax-module/ax-demo.ts"
```

The demo uses a mock provider and does not read `.env`.

## Effect integration
The production module should wrap these with Effect services (e.g. AxRegistryLive,
AxResolverLive, AxEngineLive, AxOptimizerLive) and publish to the workflow EventBus.
