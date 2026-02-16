# @chiron/template-engine

Template and prompt composition module (planned extraction).

## What This Package Contains

- `src/index.ts` - scaffold export

## Current State

- Standalone package is scaffold-only
- Template rendering currently happens inline in workflow-engine and other modules

## Intended Scope

- Template registry and versioning
- Handlebars-based rendering service with helpers
- Context-aware composition for system prompts, initial prompts, and artifact templates
- Prompt receipt generation hooks for audit/reproducibility
- Diagnostics for missing or invalid template variables
