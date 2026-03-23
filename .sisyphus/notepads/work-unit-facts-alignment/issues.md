## 2026-03-23

- No implementation blockers encountered.
- One transient type mismatch occurred after extending `UiFact`; resolved by ensuring `saveFact()` populates all newly required fields on `nextFact`.
- Added `schemaDialect?: string` to local `RawFactValidation` typing to support JSON schema serialization payload without widening API contracts.
