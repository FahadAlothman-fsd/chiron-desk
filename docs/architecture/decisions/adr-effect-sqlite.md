# ADR-001: Effect + SQLite Integration Pattern

**Status:** Accepted

## Context

The Effect ecosystem lacks an official bridge for integrating Drizzle ORM with SQLite. While Effect provides powerful error handling and async composition, there is no standard library for wrapping Drizzle database operations into Effect's type system.

## Decision

Wrap Drizzle query operations using `Effect.tryPromise()` to integrate SQLite database calls into Effect workflows. This provides:
- Automatic error handling via Effect's error channel
- Type-safe composition with other Effect operations
- Consistent error propagation

## Pattern

```typescript
import { Effect } from "effect";
import { db } from "@/db";

const queryUsers = Effect.tryPromise(() => db.query.users.findMany());
```

For custom error handling, use Effect's tagged error types:

```typescript
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

const safeQuery = Effect.tryPromise(() => db.query.users.findMany())
  .pipe(Effect.mapError(cause => new DatabaseError({ cause })));
```

## Consequences

- **Manual wrapping required:** Each database operation must be explicitly wrapped
- **Type safety:** Full TypeScript type inference across the Effect pipeline
- **Error handling:** Errors are automatically caught and propagated through Effect's error channel
- **Implementation burden:** Database layer requires Effect integration at call sites

## Alternatives Considered

1. **Direct Promise usage** - Loses type safety and error composition benefits
2. **Custom Effect adapter library** - Deferred to future if pattern becomes widespread
