# OpenCode Adapter Capability Design

Date: 2026-03-16
Status: Proposed

## Goal
Define how Chiron should integrate with OpenCode for agent-step execution without coupling core runtime behavior to unstable OpenCode internals.

The design must support:
- reliable discovery of required OpenCode metadata surfaces
- harness-aware execution for agent steps
- deterministic prompt composition and injection
- explicit fallback policy when SDK or API coverage is incomplete

## Problem Statement
Epic 3 currently assumes Chiron can execute agent-driven flows through OpenCode while also understanding enough about the OpenCode environment to make good runtime decisions. The risk is that this integration surface may be wider and less stable than it looks.

The highest-risk unknowns are:
- whether OpenCode exposes agents, MCPs, providers, plugins, and skills through stable SDK or API surfaces
- whether Chiron can select harnesses and agents without brittle filesystem spelunking
- whether system prompt layering and step-scoped prompt injection are supported cleanly
- whether missing SDK coverage forces targeted fallback behavior for required surfaces

## Recommended Approach
Use a capability-driven `OpenCodeAdapter` boundary.

Chiron owns the canonical execution contract. OpenCode integration happens through one adapter that reports what it can do, how each surface is sourced, and which capabilities are unavailable.

This avoids two common failure modes:
- leaking OpenCode-specific filesystem logic throughout Chiron
- assuming all metadata surfaces deserve the same priority or fallback behavior

## Options Considered

### Option 1: Capability-Driven Adapter (Recommended)
Define a single adapter for discovery plus execution. Each metadata surface is classified independently.

Pros:
- keeps Chiron architecture stable even if OpenCode exposure is uneven
- allows selective fallback by surface instead of all-or-nothing policy
- makes unsupported capabilities explicit

Cons:
- requires an up-front capability matrix and adapter design work

### Option 2: SDK-First With Ad Hoc Exceptions
Use SDK or API where available, then bolt on one-off fallbacks when a story blocks.

Pros:
- lower up-front design cost
- may move faster for the first integration slice

Cons:
- encourages hidden policy drift
- makes long-term maintenance worse
- creates inconsistent behavior across surfaces

### Option 3: Minimal Execution-Only Integration
Ignore most discovery surfaces and only implement the smallest agent-step execution path needed for Epic 3.

Pros:
- lowest immediate complexity
- good if Epic 3 only needs one narrow execution slice

Cons:
- weak operator visibility
- likely redesign later when more metadata is needed
- hides platform capability gaps until late

## Architecture

### Core Boundary
Chiron should interact with OpenCode only through an `OpenCodeAdapter` interface.

The adapter owns two responsibilities:
- metadata discovery
- execution control

Chiron should not directly inspect OpenCode directories, config files, or raw internal data shapes outside this boundary.

### Capability Reporting
Each surface should report:
- priority: `required` or `optional`
- source mode: `native`, `fallback`, or `unsupported`
- provenance details: SDK, API, config, or targeted filesystem discovery

This lets Chiron distinguish:
- surfaces it must have for runtime correctness
- surfaces it can skip safely
- surfaces that require explicit operator or engineering follow-up

## Discovery Policy

### Surface Priorities
Recommended initial classification:
- `agents`: required
- `providers`: required
- `mcps`: likely required
- `plugins`: optional
- `skills`: optional

Interpretation:
- `agents` are core if agent-step execution depends on selecting OpenCode agents
- `providers` matter if user-configured providers affect runtime selection or prompt execution
- `mcps` matter if tool or harness behavior depends on already-configured MCP availability
- `plugins` and `skills` should not block Epic 3 unless a story proves they are functionally required

### Fallback Rules
Fallback is allowed per surface, not globally.

Recommended policy:
- use SDK or API first whenever possible
- allow targeted filesystem fallback only for required surfaces that are not exposed natively
- skip optional surfaces when no stable exposure exists
- never introduce blanket filesystem crawling as the default integration model

Example:
- if `agents` are required and not exposed natively, allow controlled fallback
- if `skills` are not exposed, skip them rather than building a fragile discovery layer

## Execution And Prompt Injection

### Harness Resolution
Chiron should request execution through named harness capabilities, not raw OpenCode internals.

The adapter should resolve:
- which harness is available
- whether the harness supports the requested execution mode
- what discovery or prompt capabilities that harness can satisfy

If the harness cannot satisfy the request, it should return structured failure with actionable diagnostics.

### Prompt Composition
Prompt shaping should be an adapter-mediated execution input, not a side-channel hack.

Recommended layered model:
1. agent identity or base prompt
2. Chiron system policy overlay
3. step-scoped system prompt additions
4. runtime context attachments
5. user or task prompt

The adapter should either:
- pass this through supported OpenCode execution surfaces, or
- explicitly report unsupported prompt-layering capability

This keeps prompt injection deterministic and auditable.

## Epic 3 Implications
This concern should become an explicit early Epic 3 spike and design gate.

The first deliverable should not be full agent-step execution. It should be a capability proof covering:
- what OpenCode exposes natively
- which required surfaces need fallback
- which optional surfaces can be deferred
- whether prompt layering is supported cleanly
- which execution behaviors need adapter-owned normalization

Without that proof, Stories `3.6`, `3.7`, and downstream runtime-entry stories risk hidden platform coupling and rework.

## Acceptance Signals
This design is working if:
- Chiron can enumerate required OpenCode surfaces without spreading discovery logic across the codebase
- unsupported or skipped surfaces are explicit rather than implicit
- prompt composition rules are deterministic and adapter-owned
- targeted fallbacks exist only where justified by required behavior
- Epic 3 planning can distinguish platform gaps from story implementation work

## Open Decisions
- whether `mcps` should be treated as required in Epic 3 baseline or only once MCP-backed execution stories begin
- whether provider discovery is only for display and selection, or also required for execution policy validation
- whether fallback discovery for `agents` should use native OpenCode home, app-managed mirrors, or a stricter Chiron-controlled root
- how much prompt receipt and audit detail should be persisted by default
