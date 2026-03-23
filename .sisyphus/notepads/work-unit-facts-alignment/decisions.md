## 2026-03-23

- Preserved `work unit`-specific behavior: validation remains `none` while still supporting dependency metadata; this is the only intentional divergence from methodology fact types.
- Limited validation controls to `factType === "string"` to match methodology behavior and avoid exposing unsupported validation for number/boolean/json/work unit facts.
- Added boolean default input as checkbox + true/false label in the work-unit dialog for type-specific UX while retaining string-backed form state for serialization compatibility.
- Reused methodology `JsonSubKey` helper semantics in `FactsTab.tsx` (id sequencing, empty key generation, default parsing, and schema emission) to avoid divergence between methodology and work-unit fact editors.
- Set saved `UiFact.validationKind` to `"json-schema"` for `json` facts so table badges accurately reflect schema-backed validation.
