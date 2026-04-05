# L3 Slice 1 Design-Time Context Facts and Form - Decisions

## Architectural Decisions
- workflow-editor route is the canonical design-time surface
- Context-fact definitions are editor-level siblings of Form definitions
- Form dialog tabs: Contract | Fields | Guidance
- Context-fact dialog tabs: Contract | Value Semantics | Guidance

## 2026-04-05 Final verification decisions
- Keep router-side validation hand-authored but contract-aligned for slice-1 payloads; this fixes the live API boundary without widening the task into broader contract/schema plumbing.
- Keep the demo fixture on the existing `methodologyWorkflowFormFields.inputJson` storage shape, but treat it as a binding envelope carrying `contextFactDefinitionId` only; UI widget behavior remains derived elsewhere.

## 2026-04-05 Value semantics UI decisions
- Keep `apps/web/src/features/workflow-editor/dialogs.tsx` on the existing slice-1 submission contract: rich Value Semantics controls update only the already-supported saved fields (`valueType`, external/artifact/workflow/work-unit references, included fact keys) and do not invent new payload properties in this patch.
- Use mock option catalogs for external facts, workflows, artifacts, work-unit types, and included fact cards so the workflow-editor can ship the intended combobox/card interactions now without blocking on upstream query plumbing.

## 2026-04-05 Validation propagation fix decisions
- Replace the workflow-editor external-fact mock catalog with live methodology fact options from `orpc.methodology.version.fact.list`, but keep a route-level empty fallback so test harnesses without that branch continue to render.
- Export `toast` from the shared `@/components/ui/sonner` wrapper and keep route-level create/update context-fact handlers responsible for formatting user-facing validation failures before rethrowing.

## 2026-04-05 Real picker data decisions
- Move workflow-reference and draft-spec fact option hydration into the workflow-editor route so `WorkflowEditorShell` and `WorkflowContextFactDialog` receive pre-shaped live picker data via props.
- Keep artifact-slot and work-unit-type picker catalogs unchanged in this patch because the only authoritative procedures provided for the task were methodology facts, work-unit facts, and work-unit workflows.

## 2026-04-05 Draft-spec picker live data decisions
- Replace the `Work Unit Type Key` mock catalog in `apps/web/src/features/workflow-editor/dialogs.tsx` with route-shaped options from `orpc.methodology.version.workUnit.list` so the dialog shows real methodology work units like Brainstorming/Research/Setup.
- Keep work-unit fact loading query-backed inside the dialog via a route-provided loader and a version-scoped React Query key; this preserves the existing picker component pattern while fetching facts only after a work unit is selected.

## 2026-04-05 Fact picker badge decisions
- Keep badge shaping in the workflow-editor route so raw methodology/work-unit fact payloads are normalized once into `WorkflowEditorPickerOption` objects before they reach dialog components.
- Reuse the existing generic `SearchableCombobox` and add optional badge rendering instead of introducing a fact-specific picker component; artifact-slot and work-unit-type pickers continue to render descriptions unchanged.
- Strip source badges only for the work-unit draft-spec fact picker so external fact pickers show source/cardinality/type metadata while draft-spec fact pickers stay at the requested cardinality/type/[work-unit definition] badge set.

## 2026-04-05 Context-fact discard UX decisions
- Match the methodology-facts discard pattern in `apps/web/src/features/workflow-editor/dialogs.tsx`: dirty tab labels get `*`, close attempts route through a confirmation dialog, and the confirmation copy stays on the shared “Discard unsaved changes?” wording.
- Keep dirty-state detection local to `WorkflowContextFactDialog` via snapshot comparison instead of introducing shared dialog infrastructure, since only this workflow-editor dialog needed the missing behavior in this patch.
