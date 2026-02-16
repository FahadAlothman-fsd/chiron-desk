# Prompt Composer Module Design (Archived, Superseded)

> **STATUS: ARCHIVED / SUPERSEDED**
>
> Archived from `docs/architecture/modules/prompt-composer.md` after module rename and consolidation into `template-engine`.
>
> Active canonical module doc: `docs/architecture/modules/template-engine.md`.

**Package:** `@chiron/template-engine`  
**Status:** Historical snapshot

## Purpose

Provide a single prompt composition pipeline from template + context to rendered prompt text.

## Current Reality

- Standalone package is scaffold-only.
- Template resolution is currently distributed across workflow/runtime code and seed content.
- Handlebars patterns are used in step configs and prompt fields.

## MVP Responsibilities

- Template registry with id/version lookup.
- Render service (Handlebars-based) with safe helper set.
- Context merge and diagnostics (missing vars, unresolved keys).
- Deterministic render output for reproducibility.

## Phase 2 Responsibilities

- Template partials and composition patterns.
- Render caching for high-throughput agent steps.
- Prompt diagnostics metadata for AX optimization feedback loops.

## Effect Service Shape (Target)

- `compose(templateRef, context) -> Effect<ComposeResult, PromptComposerError>`
- `register(template) -> Effect<void>`
- `get(templateRef) -> Effect<Option<PromptTemplate>>`

## Dependencies

- `@chiron/contracts` (template/compose schemas)
- `@chiron/variable-service`

## Historical Open Decisions (Superseded)

- Strict failure on missing variables vs soft fallback placeholders.
- How much helper logic is permitted before templating becomes business logic.
