# Issues - Finish L2 Transition Dialog

## Active Issues
*None yet*

## Resolved Issues
*None yet*

- 2026-03-23: `bun test <file>` fails for this React Testing Library suite in this repo because Bun's native runner has no DOM (`window is not defined`). Verification used the app's Vitest runner (`bun run --cwd apps/web test <file>`) where all tests pass under jsdom.
- 2026-03-23: The plan's raw `bun test "apps/web/src/tests/..."` command drops `$methodologyId/$versionId` shell segments unless escaped/quoted as a literal path; use single-quoted path string to keep the literal filename filter.
- 2026-03-23: No additional implementation issues encountered during Task 3; edit-mode group behavior worked with localized UI/state changes only.

- 2026-03-29: Runtime guidance test fixture originally returned `null` for `getProjectWorkUnitById`, which caused new existing-work-unit drill-in coverage to fail with `Project work unit not found`; fixed by returning deterministic fixture rows for `wu-1`/`wu-2`.
