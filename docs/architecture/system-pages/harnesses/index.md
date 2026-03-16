# Harnesses Page

This document captures the Task 5 implementation-facing spec for the system-owned Harnesses page, grounded in the March 9 shell IA baseline and Story 3.6 acceptance criteria.

Use `docs/architecture/epic-3-authority.md` for routing and precedence status. Use this page for Harnesses page behavior and ownership.

## Scope

- This is the durable spec for the system-owned Harnesses page.
- It defines page purpose, shell placement, information architecture, harness visibility, configuration boundaries, and policy-state behavior.
- It defines how `agent.v1` harness selection, especially `opencode`, resolves through system-governed configuration plus provider-registry policy.
- It does not redefine the `agent.v1` step schema or provider-registry internals.

## Page purpose

- Give operators one system-level home for harness configuration and visibility.
- Make runtime harness selection explicit, governed, and reusable across methodology and project surfaces.
- Keep credentials, policy, and availability state visible without exposing secrets.
- Prevent methodology-owned pages from inventing their own harness catalogs or policy logic.

## Shell placement and ownership

- `Harnesses` lives in the `System` sidebar alongside `Home`, `Methodologies`, `Projects`, and `Settings`.
- The page is system-owned, not methodology-owned and not methodology-version-owned.
- Methodology and workflow authoring surfaces may reference harnesses, but they consume system-defined harness entries instead of owning them.
- The page follows the shallow-shell rule from `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md`: global navigation stays in the sidebar, while deeper harness detail stays in the main pane.

## Locked information architecture

- `Overview` section for system ownership, readiness counts, and operator guidance.
- `Harness catalog` section listing available harness families such as `chiron` and `opencode`.
- `Configuration` section for system-scoped, non-secret harness settings and provider/model defaults where policy allows.
- `Policy and access` section showing credential availability, policy blocks, compatibility, and deprecation state sourced from system services.
- `Diagnostics` section for actionable harness findings, retry-policy context, and remediation guidance.

Each harness entry should expose at least:

- harness key and display name
- supported runtime family or integration lane
- current availability state
- system-scope configuration summary
- actionable diagnostics or next-step guidance when not ready

## Harness catalog visibility and configuration rules

- Harness catalog membership is system-governed. Methodology pages and step editors must not create ad hoc harness entries.
- The page shows system-supported harness families even when they are not currently runnable, because blocked or incomplete setup still needs visible remediation.
- Secret material is never rendered here. The page can show credential presence, absence, or test state only.
- System-scoped harness configuration is limited to durable, non-secret defaults and enablement metadata needed for downstream selection.
- Provider and model options shown for a harness must come from `docs/architecture/modules/provider-registry.md`, not from step-local code paths or `@chiron/agent-runtime` directly.
- This page may summarize which providers or models are usable for `opencode`, but provider-registry remains authoritative for compatibility, catalog visibility, and policy decisions.

## State model

### Ready

- Harness is visible.
- Required policy checks pass.
- Required credential references exist.
- Compatible provider and model options are available for the runtime family.

### Credential action required

- Harness remains visible.
- Selection is blocked until required user-scoped credentials exist or validate.
- The page shows actionable remediation without exposing credential values.

### Policy blocked

- Harness remains visible.
- Registry or system policy can block use because of allowlist, denylist, quota, spend, compatibility, or deprecation constraints.
- The page shows the blocking reason and the controlling policy source.

### Availability degraded or unavailable

- Harness remains visible.
- The page shows outage, health, or compatibility findings that make the harness unavailable for execution.
- Alternative recommendations may be shown when provider-registry returns ranked alternatives, but the page must not imply automatic failover.

### Diagnostics visible

- Structured diagnostics are shown in-page for configuration, policy, and availability failures.
- Findings should be actionable and align with the shared Epic 3 diagnostics posture.

## `agent.v1` harness resolution

- `docs/architecture/methodology-pages/workflow-editor/agent-step.md` defines the step field shape: `harness: "chiron" | "opencode"` plus optional `harnessConfig`.
- The step contract chooses the harness family. This system page governs whether that family is configured and available for use.
- When a step author selects `opencode`, the selection resolves through the system Harnesses page configuration first, then through provider-registry policy and runtime compatibility checks.
- Step-local configuration may refine allowed non-secret behavior, but it must not bypass system-owned harness definitions, credential rules, or provider-registry decisions.

Resolution flow for `opencode`:

1. Author selects `harness = opencode` in the agent step.
2. The editor reads the system-owned `opencode` harness entry exposed by this page.
3. Provider-registry resolves compatible provider and model options for the `opencode` runtime family, including credential availability and policy state.
4. The page and the step editor surface the resolved state, blocking diagnostics, or ready status.
5. Runtime execution uses the resolved selection and registry-owned retry or quota policy. It does not invent separate harness policy in the step layer.

## What this page owns

- system-level harness catalog visibility
- system-scope harness readiness and configuration summaries
- operator-facing policy, credential, availability, and diagnostics presentation for harnesses
- the system home that Story 3.6 requires for explicit harness management

## What this page does not own

- methodology-owned agent definitions or methodology page behavior
- the `agent.v1` schema itself
- provider-registry resolution logic, credential storage, or policy evaluation internals
- automatic cross-provider fallback behavior
- project, execution, or step precedence rules beyond showing the system-owned baseline that those lower scopes build on

## Cross-references

- Use `docs/architecture/modules/provider-registry.md` for provider, model, credential, and policy authority.
- Use `docs/architecture/methodology-pages/workflow-editor/agent-step.md` for `agent.v1` harness fields and step-level configuration shape.
- Use `docs/architecture/epic-3-authority.md` for routing, promotion status, and precedence.
- Use `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md` as historical IA rationale for why Harnesses is system-owned.
