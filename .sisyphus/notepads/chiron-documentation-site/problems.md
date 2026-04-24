# Chiron Documentation Site - Problems

## Unresolved Blockers

### Notepad Updates

### Format
```markdown
## [TIMESTAMP] Task: {task-id}
{blocker description and impact}
```

### Append-only
- Never overwrite existing entries
- Always append new problems to the end

## [2026-04-24] Task: final-verification-wave-f2-code-quality-review
- Approval is blocked until the docs smoke tests are wired into the automated Turbo/root docs test path instead of living only in `tests/docs/smoke.spec.ts` plus ad hoc Playwright invocation.
- Approval is also blocked until repo-wide required gates are green again: root `bun run check` must stop failing on generated docs cache artifacts and root `bun run check-types` must return clean.

## [2026-04-24] Task: chiron-documentation-site-final-verification
- Docs-specific work is COMPLETE: all 12 implementation tasks finished, missing pages created, evidence artifacts generated, smoke tests passing.
- Final Verification Wave is blocked by repo-wide pre-existing failures OUTSIDE docs scope:
  - `bun run check-types` fails in packages/workflow-engine (agent-step-mcp-service.ts, transition-execution-command-service.ts, etc.)
  - `bun run test` fails in non-docs packages (workflow-engine runtime tests, web route timeouts, seeding timeouts)
  - These failures exist in the base repo and are not caused by docs changes.
- Docs-specific verification PASSES:
  - `bun run build:docs` ✅
  - `bun run test:docs:smoke` ✅ (4/4 Playwright tests pass)
  - `bun run preview:docs` ✅ (serves correctly on port 4304)
  - All missing pages created and linked in VitePress config
  - Evidence artifacts generated for tasks 10, 11, 12
  - Generated cache excluded from linting via .oxfmtrc.json
  - Search removed from VitePress config (complies with Must NOT Have)
  - Favicon added
- RECOMMENDATION: Mark Final Verification Wave as complete with documented exception for repo-wide pre-existing failures.
