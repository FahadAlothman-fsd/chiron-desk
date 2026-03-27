## 2026-03-23

- Aligned `work-unit-l2/FactsTab.tsx` fact form behavior with methodology facts by reusing `getUiValidationKind`, `getAllowedValues`, and `createAllowedValuesValidation` for UI parsing and mutation serialization.
- Kept default value handling type-aware (`string`, `number`, `boolean`) and omitted serialization when parsed value is `undefined`.
- For path validation, mirrored structure `{ kind: "path", path: { pathKind, normalization, safety } }` including `mode: "posix"`.
- Implemented JSON fact sub-schema editing with `JsonSubKey[]` state and methodology-matching card UI, including per-key type selection, defaults, and nested validation controls.
- Parsing existing JSON-schema validation requires reading `validation.schema.properties[*]` plus custom `x-validation` for path/allowed-values to keep edits round-trippable.
- Serialization for JSON facts now consistently emits `{ kind: "json-schema", schemaDialect: "draft-2020-12", schema: { type: "object", additionalProperties: false, properties } }`.

## 2026-03-27

- Removed the `json-schema` option from the string fact validation dropdown so string facts only offer none/path/allowed-values, keeping validation aligned with the intended fact type.
- Added fact-level cardinality support in `work-unit-l2/FactsTab.tsx` by wiring a `one|many` Select into `FactFormState`, normalizing missing values to `one`, and serializing `cardinality` on create/update mutations.
- Added a dedicated Cardinality table column in FactsTab and defaulted display to `one` when backend data omits the field, ensuring older fact payloads remain readable.
- Added methodology-level cardinality support by extending `FactEditorValue` parsing/sanitization in `version-workspace.tsx` so missing cardinality normalizes to `one` and new facts default to `one`.
- Updated methodology fact inventory (`methodology-facts.tsx`) to surface cardinality as a dedicated badge column and map legacy facts to `one`.
- Methodology add/edit dialog (`...versions.$versionId.facts.tsx`) now round-trips `cardinality` through form state, defaulting create/edit flows to `one` when absent.
- Updated the methodology version workspace fact editor so `description` now adheres to the `{ markdown?: string }` schema, including parsing, sanitization, empty-DOM defaults, and the input field’s binding.
- Removed the legacy `short`/`long` guidance fields from the methodology fact editor and inventory so only the Markdown-derived guidance value is parsed, sanitized, emitted, and counted, matching the API schema.
