## 2026-04-05 workflow-editor fact picker fixes

- `orpc.methodology.version.workUnit.fact.list` returns methodology-wide `factDefinitions` plus `workUnitTypes[].factSchemas`; clients must select the target work unit's `factSchemas` by `workUnitTypeKey` instead of passing the raw payload through the generic fact-options mapper.
- Workflow-editor external fact pickers need a merged option list of methodology facts and the current route work unit's facts to surface both global and local bindings.
- Artifact reference facts persist `artifactSlotDefinitionId`, but the backing methodology repository maps that field to the artifact slot key, so picker options should use real slot keys from the current work unit artifact-slot API data.
- Fact-picker options in `apps/web/src/features/workflow-editor/types.ts` now support badge metadata and search text, which lets the combobox render rich metadata rows without changing trigger behavior.
- The workflow-editor route must resolve `workUnitTypeKey` to the work-unit display name when a fact has `valueType: "work_unit"`; otherwise the picker cannot show the requested work-unit definition badge.

## 2026-04-05 context fact cardinality binding

- Context-fact cardinality constraints for external bindings should be derived from picker badge metadata (`badge.tone === "cardinality"`) instead of duplicated per-kind logic.
- `definition_backed_external_fact`, `bound_external_fact`, and `work_unit_draft_spec_fact` all share the same narrowing rule: source `one` can only render `one`, while source `many` or no selection keeps both options available.
- When the selected source narrows to `one`, the dialog should coerce the active Select value to `one` as well as hiding `many`, so invalid persisted or previously chosen `many` values do not leave the Select in an inconsistent state.

## 2026-04-05 workflow-editor context-fact dirty state

- `WorkflowContextFactDialog` needs dirty detection based on a normalized snapshot of authored dialog state, not ad-hoc onChange flags, because the dialog spans three tabs and some value-semantics controls live outside the persisted `draft` object.
- Snapshot comparisons should ignore transient card/local ids (`draftSpecCards.localId`, `jsonSubSchemaDraft.localId`) and compare authored values only; otherwise async label hydration or remove/re-add flows can create false dirty states.
- Routing close requests through `Dialog.onOpenChange` plus the Cancel button covers X, overlay click, and Escape with the same discard-confirmation UX.
