# @chiron/event-bus

Cross-module event transport package (planned extraction).

## What This Package Contains

- `src/index.ts` - scaffold export

## Current State

- Standalone package is scaffold-only
- Inline event bus implementation exists in `@chiron/workflow-engine` (`services/event-bus.ts`)

## Intended Scope

- Shared EventBus contracts and service interface
- Publish/subscribe stream APIs for modules
- Optional event persistence/replay hooks for observability
