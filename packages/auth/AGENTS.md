# @chiron/auth

Authentication package for Chiron.

## What This Package Contains

- `src/index.ts` - Better-Auth setup and exported auth helpers

## Current State

- Thin and stable
- Uses `@chiron/db` for persistence
- Consumed by API/server layers

## Notes

- Keep auth logic centralized here
- Avoid duplicating auth behavior in API routers
