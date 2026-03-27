## 2026-03-23

- Aligned `work-unit-l2/FactsTab.tsx` fact form behavior with methodology facts by reusing `getUiValidationKind`, `getAllowedValues`, and `createAllowedValuesValidation` for UI parsing and mutation serialization.
- Kept default value handling type-aware (`string`, `number`, `boolean`) and omitted serialization when parsed value is `undefined`.
- For path validation, mirrored structure `{ kind: "path", path: { pathKind, normalization, safety } }` including `mode: "posix"`.
- Implemented JSON fact sub-schema editing with `JsonSubKey[]` state and methodology-matching card UI, including per-key type selection, defaults, and nested validation controls.
- Parsing existing JSON-schema validation requires reading `validation.schema.properties[*]` plus custom `x-validation` for path/allowed-values to keep edits round-trippable.
- Serialization for JSON facts now consistently emits `{ kind: "json-schema", schemaDialect: "draft-2020-12", schema: { type: "object", additionalProperties: false, properties } }`.

## 2026-03-27

- Removed the `json-schema` option from the string fact validation dropdown so string facts only offer none/path/allowed-values, keeping validation aligned with the intended fact type.
