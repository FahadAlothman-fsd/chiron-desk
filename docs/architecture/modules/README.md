# Module Design Docs

**Last Updated:** 2026-02-12  
**Status:** Active

These docs define the detailed design for modules that are scaffold-only or underdesigned.

## Modules

- `event-bus.md`
- `variable-service.md`
- `template-engine.md`
- `provider-registry.md`
- `sandbox-engine.md`
- `ax-engine.md`
- `observability.md`

## Related Cross-Cutting Docs

- `../workflow-versioning.md`
- `../git-context-variables.md`
- `../branching-strategy.md`
- `../workflow-diagram-ui-react-flow.md`
- `../method-workitem-execution-contract.md`
- `../method-workitem-execution-examples.md`

## Package Responsibility Map (CCF.5 Lock)

`package-responsibility-map` for Epic 3 prerequisite governance.

| Package / Surface | Responsibility Ownership | Explicitly Not Owned |
| --- | --- | --- |
| `packages/core` (`@chiron/core`) | Thin orchestration, use-case coordination, policy composition, ports/interfaces | DB/filesystem/process adapters, Electron host code, Hono/oRPC handlers, React/TanStack UI |
| `workflow-engine` | Workflow/transition orchestration domain behavior | Transport handlers and host runtime integration |
| `methodology-engine` | Methodology/work-unit/transition domain rules | UI/transport/runtime adapter code |
| `project-context` | Project-context domain services and pin policy behavior | Transport, host, and persistence adapter implementations |
| `contracts` | Shared interfaces/schemas/events across module boundaries | Concrete adapter/host/transport implementation |
| API transport (`apps/server`) | Hono/oRPC transport composition and handler wiring | Domain decision logic and core policy ownership |
| App shells (`apps/desktop`, `apps/web`) | Host/runtime shell + UI rendering and interaction surfaces | Domain/core orchestration ownership |

### Dependency direction and anti-coupling rules

- contracts-centered dependency rule: shared seams live in `packages/contracts`.
- Required direction: `packages/contracts` <- domain packages (`workflow-engine`, `methodology-engine`, `project-context`) <- `packages/core` (`@chiron/core`) orchestration/policy <- adapters/app shells.
- Anti-coupling: no direct reverse ownership leak from transport/runtime/UI into `core`.
- Design-time/runtime split lock:
  - `@chiron/methodology-engine` owns design-time authoring definitions and publication.
  - runtime packages consume published contracts/projections and must not import methodology-engine repository/mutation seams.

### Work-unit workflow ownership (canonical)

- `methodology version` remains publish/release root.
- workflow authoring ownership is under `work unit` (not version-root writable collections).
- transition-workflow bindings are scoped under work-unit transition identity; version-level workflow summaries are compatibility projections only.

### Stability disclaimer

- Execution-side module/service internals are provisional and expected to evolve rapidly.
- Stable boundaries are design-time contracts and runtime-facing published contracts/projections.

### Boundary diagnostics expectations

- `boundary-violation-diagnostics`: raised when forbidden transport/runtime/UI/adapter ownership is introduced into `core`.
- `package-ownership-diagnostics`: raised when dependency direction or ownership boundaries are violated.
