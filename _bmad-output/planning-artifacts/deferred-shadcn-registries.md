# Deferred Shadcn Registries Setup Contract

## Overview
This document formalizes the deferment of shadcn registry bootstrap to post-reset baseline completion. Registry setup is explicitly OUT OF SCOPE for the reset baseline phase and will be triggered during story implementation.

## Deferred Registries

The following registries are candidates for adoption during story implementation:

1. **@shadcn/ui** (Official) — Primary registry for shadcn components
2. **@shadcn** (Official) — Core shadcn registry
3. Custom registries (by exception only) — Project-specific component libraries

**Decision**: Official shadcn registries will be the default source. Custom registries require documented justification and architecture review.

## Component Intake Policy

### Primary Policy
- **Official shadcn components first** — All component needs should be satisfied by official @shadcn/ui registry before considering alternatives
- **Custom components by exception** — Only when official registry lacks required functionality or design patterns
- **Exception process** — Custom components require:
  - Architecture review
  - Design alignment documentation
  - Maintenance plan

### Implementation Timing
- Registry bootstrap occurs during **story implementation phase**
- Component selection happens at **story intake** (not during reset baseline)
- Policy enforcement via **code review** and **architecture gates**

## Trigger Gate for Registry Bootstrap

Registry setup is triggered when:

1. **Condition**: First story requiring UI components enters implementation
2. **Action**: Initialize shadcn registry configuration in `components.json`
3. **Scope**: Add official @shadcn/ui registry as primary source
4. **Validation**: Verify registry connectivity and component availability

**Timing**: Post-reset baseline, during Phase 4 (Implementation)

## Non-Goal for Reset Baseline

**EXPLICIT STATEMENT**: Shadcn registry setup is **NOT** included in the reset baseline completion scope.

- ❌ Do NOT initialize `components.json` during reset
- ❌ Do NOT add registry dependencies to package.json
- ❌ Do NOT create component scaffolding
- ✅ DO document this deferment (this file)
- ✅ DO establish intake policy for future use

This deferment allows reset baseline to focus on core architecture and planning without UI framework coupling.

## Next Steps

When triggered (post-reset):
1. Initialize shadcn CLI configuration
2. Add @shadcn/ui registry to components.json
3. Begin component intake per policy
4. Update this document with actual registry choices
