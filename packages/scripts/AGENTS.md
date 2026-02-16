# @chiron/scripts

Operational and seed scripts package.

## What This Package Contains

- `src/index.ts` - script exports
- `src/seeds/` - BMAD/system seed pipelines
- `src/verify/` - post-seed/data verification helpers
- `src/migrations/` - utility migration scripts

## Current State

- Implemented and used in local setup flows (`bun db:seed`, related script commands)

## Notes

- Keep script logic deterministic and idempotent where possible
- Avoid embedding application runtime logic here; this package is operational tooling
