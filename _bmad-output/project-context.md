---
project_name: "chiron"
user_name: "Gondilf"
date: "2026-02-23"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: "complete"
rule_count: 24
optimized_for_llm: true
---

# Project Context for AI Agents

_This file captures implementation rules from preserved project documentation. Use it as canonical guidance while code is reset/refactored._

## Technology Stack & Versions

_Version note: entries here are planning-time targets and may change during reset bootstrap. Lock exact versions only after the new baseline is scaffolded and validated._

- Runtime/package manager: Bun (version pinned during reset bootstrap)
- Monorepo orchestrator: Turborepo (task pipeline/workspace orchestration)
- Language: TypeScript (`^5`, strict mode)
- Frontend: React 19 + TanStack Router/Query + Tauri v2
- Backend: Hono + oRPC 11
- Orchestration core: Effect + `@effect/platform` (versions pinned during reset bootstrap)
- Persistence: Drizzle ORM (`0.44.x`) with SQLite-only runtime baseline for current horizon
- Auth: Better-Auth (`1.3.x`)
- AI: Vercel AI SDK + OpenCode SDK

## Critical Implementation Rules

### Language-Specific Rules

- Keep TypeScript strict (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`).
- Avoid `as any` and `@ts-ignore` in production code paths.
- New boundary contracts should use Effect Schema (`Schema.Struct`) rather than introducing new Zod-first paths.
- Decode external/boundary input at package boundaries before business logic.

### Framework-Specific Rules

- Workflow execution model is Effect-first: fibers for concurrency, scopes for lifecycle, streams/pubsub for eventing.
- Do not use switch-based step dispatch; use registry/handler lookup patterns.
- Agent side effects must flow through tooling/approval boundaries, not ad hoc direct execution.
- Keep module contracts explicit via `Context.Tag` + `Layer` wiring.

### Testing Rules

- Co-locate tests with implementation using `*.test.ts`.
- Validate behavior at service boundaries (workflow engine, approval, event-bus, decode boundaries).
- Favor deterministic tests around workflow state transitions and approval rendezvous.
- Keep fixture setup minimal and explicit; avoid hidden global mutation.

### Code Quality & Style Rules

- Use OXC toolchain (`bun check`) for lint/format expectations.
- Keep imports explicit and stable; prefer path aliases where configured.
- Avoid editing generated artifacts manually (for example route tree outputs).
- Keep comments high-signal: explain non-obvious intent, not obvious mechanics.

### Development Workflow Rules

- Development DB flow uses schema push in local development (`bun db:push`) with SQLite via `@libsql/client`.
- Respect module boundaries documented under `docs/architecture/modules/`.
- Preserve contracts as the shared cross-package surface (`@chiron/contracts`).

### Critical Don’t-Miss Rules

- Do not bypass approval semantics (`allow | ask | deny`) when integrating tool execution.
- Do not collapse module boundaries by direct cross-module internals imports.
- Do not introduce new legacy patterns where migration direction is already documented (Effect-native contracts).
- Do not add implementation details that conflict with `_bmad-output/planning-artifacts/ux-design-specification.md` and `_bmad-output/planning-artifacts/reset-baseline-checklist.md`.

## Canonical Docs to Consult

- `AGENTS.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/reset-baseline-checklist.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/workflow-engine/effectful-design.md`
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/methodology-pages/workflow-editor/action-step.md`
- `docs/architecture/modules/README.md`
- `packages/contracts/AGENTS.md`

## Command Reference
- `bun dev` - Run all services for development
- `bun build` - Build all applications
- `bun check-types` - Workspace typecheck command
- `bun check` - Lint/format validation with OXC
- `bun run test` - Run test suite
- `bun db:push` - Push schema changes in development
- `bun db:generate` - Generate database client/types
- `bun db:studio` - Open Drizzle Studio

## Implementation Note

This context is intentionally documentation-first because existing code is being deprecated/reset. When new code lands, update this file to include any newly locked constraints.

## Reset Bootstrap Policy

- During reset, avoid hard-locking dependency versions in this file until package setup is complete.
- After bootstrap, update this file with exact pinned versions from root and workspace `package.json` files.
- Typecheck posture for new baseline: `tsgo` preferred, with temporary fallback accepted until `tsgo` is installed and scripts are migrated.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules here, and choose the stricter option when uncertain.
- Treat listed docs as source-of-truth for architecture and boundaries.
- Propose updates to this file when new locked patterns emerge.

**For Humans:**

- Keep this file lean and focused on non-obvious constraints.
- Update when stack versions, ADRs, or module boundaries change.
- Remove outdated rules and merge duplicates during maintenance.

**Update cadence:**

- Update after each story that changes stack assumptions, ADR constraints, module boundaries, or command workflow.

Last Updated: 2026-02-23
