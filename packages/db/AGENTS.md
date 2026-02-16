# @chiron/db

Database package for Chiron (Drizzle + PostgreSQL).

## What This Package Contains

- `src/index.ts` - database exports
- `src/client.ts` - DB client wiring
- `src/schema/` - schema modules and table definitions

## Canonical Schema Docs

- Package-level overview: this file
- Detailed schema map: `packages/db/src/schema/AGENTS.md`

## Current State

- Implemented and in active use
- Development flow uses `bun db:push` (not migration-first)
