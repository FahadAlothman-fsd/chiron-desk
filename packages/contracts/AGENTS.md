# @chiron/contracts

Shared cross-package contract surface.

## What This Package Contains

- `src/index.ts` - shared types used by workflow-engine, agent-runtime, and API

## Current State

- TypeScript type-only contracts
- No runtime schema validation in this package yet

## Direction

- Migrate to Effect-native schema contracts (`Schema.Struct` + inferred types)
- Keep all cross-package payloads and event envelopes centralized here
