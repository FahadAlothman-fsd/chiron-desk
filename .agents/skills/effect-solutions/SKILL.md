---
name: effect-solutions
description: Use when implementing any Effect code, before writing services, layers, tests, or error handling
---

# Effect Solutions - Mandatory Pattern Consultation

**CRITICAL: You MUST consult effect-solutions BEFORE implementing any Effect code.**

This skill enforces mandatory consultation of the effect-solutions CLI, which contains authoritative patterns for Effect development.

---

## REQUIRED: Pre-Implementation Checklist

Before writing ANY Effect code, you MUST:

```bash
# 1. List available topics
effect-solutions list

# 2. Read the relevant topic(s)
effect-solutions show <topic>
```

**Topics you MUST check based on what you're implementing:**

| What You're Building | Required Topics |
|---------------------|-----------------|
| Service definition | `services-and-layers` |
| Layer composition | `services-and-layers` |
| Effect tests | `testing` |
| Error handling | `error-handling` |
| Schema/encoding | `data-modeling` |
| Configuration | `config` |
| Project setup | `project-setup`, `tsconfig` |
| Basic Effect usage | `basics`, `quick-start` |

---

## Correct Pattern (Effect 3.x / v4 Compatible)

**Use `Context.Tag` with class pattern:**

```typescript
import { Context, Effect, Layer } from "effect"

// ✅ CORRECT: Context.Tag with class
class MyService extends Context.Tag("MyService")<
  MyService,
  { readonly method: Effect.Effect<void> }
>() {
  static readonly Live = Layer.succeed(this, { 
    method: Effect.void 
  })
}

// Usage
const program = Effect.gen(function* () {
  const service = yield* MyService
  yield* service.method
})
```

**❌ WRONG: Effect.Service (removed in v4)**
```typescript
// DO NOT USE - Removed in Effect v4
const MyService = Effect.Service<MyService>()(...)
```

---

## Service Architecture Guidelines

### 1. Service Boundaries

Each service should have:
- **Single responsibility** - One domain concept per service
- **Clear interface** - Explicit type definition
- **Static Live member** - Default Layer implementation
- **No circular dependencies** - Services depend on lower-level services

### 2. Layer Composition Order

```typescript
// Lower-level services first
const AppLayer = Layer.mergeAll(
  ConfigLive,      // No dependencies
  DatabaseLive,    // May depend on Config
  LoggerLive,      // May depend on Config
  RepositoryLive,  // Depends on Database
  ServiceLive      // Depends on Repository + Logger
)
```

### 3. Error Handling Pattern

```typescript
// Define errors as classes
class DatabaseError {
  readonly _tag = "DatabaseError"
  constructor(readonly cause: unknown) {}
}

// Use in service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<Result, DatabaseError>
}
```

---

## Common Mistakes

| Mistake | Why Wrong | Correct Approach |
|---------|-----------|----------------|
| Using `Effect.Service` | Removed in v4 | Use `Context.Tag` with class |
| Services without Live | Hard to test | Always provide `static readonly Live` |
| Circular dependencies | Composition fails | Design DAG of dependencies |
| Catching all errors | Loses type safety | Use specific error types |
| Effect in non-Effect code | Breaks composition | Wrap in `Effect.runPromise` at edges |

---

## Quick Reference

### Running effect-solutions

```bash
# See all topics
effect-solutions list

# Read specific topic
effect-solutions show services-and-layers
effect-solutions show testing
effect-solutions show error-handling

# Search for patterns
effect-solutions search <keyword>
```

### Available Topics

- `quick-start` - Getting started with Effect
- `basics` - Core concepts
- `services-and-layers` - Service definition and composition
- `data-modeling` - Schema, encoding, decoding
- `error-handling` - Error types and handling
- `config` - Configuration management
- `testing` - Testing Effect code
- `project-setup` - Project configuration
- `tsconfig` - TypeScript configuration
- `cli` - CLI patterns

---

## Resources

- **Local effect-solutions**: `~/.local/share/effect-solutions/effect`
- **EffectPatterns**: `PaulJPhilp/effectpatterns` (300+ community patterns)
- **Effect by Example**: `ethanniser/effect-by-example` (curated snippets)
- **Official docs**: https://effect.website

---

## Enforcement

**You are FORBIDDEN from:**
- Writing Effect services without checking `services-and-layers` topic
- Writing Effect tests without checking `testing` topic
- Using `Effect.Service` (removed in v4)
- Creating services without `static readonly Live`

**Violating these rules means:**
- Code will break in Effect v4
- Services will have unclear boundaries
- Tests will be flaky or incorrect
- Layers will fail to compose
