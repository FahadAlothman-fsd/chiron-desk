## 2026-03-23

- No implementation blockers encountered.
- One transient type mismatch occurred after extending `UiFact`; resolved by ensuring `saveFact()` populates all newly required fields on `nextFact`.
- Added `schemaDialect?: string` to local `RawFactValidation` typing to support JSON schema serialization payload without widening API contracts.

## 2026-03-27

- No blockers encountered for methodology cardinality support.
- No migration issues required; fallback defaults to `one` handled compatibility for existing facts without data backfill.
