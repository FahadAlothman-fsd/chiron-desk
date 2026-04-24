# Draft: Crisp Eagle Survey Cherry-Pick

## Requirements (confirmed)
- Implement the survey only after the docs work from `crisp-eagle` has been merged into `feat/effect-migration`.
- For now, commit only the plan in the current `stellar-cactus` worktree.
- The survey itself, including the actual question set/config, should be part of the later survey implementation commits.
- The final architecture still uses the hosted docs site as the survey gateway, but survey implementation is a post-merge task because it needs both docs and app/runtime context.
- Produce the remaining implementation artifacts needed to ship the hosted survey form and embed/launch flow.
- Preserve Formbricks quota by using a non-response-burning testing approach during development and verification.
- Extend the plan to cover in-app seeding so BMAD reaches story creation and agent-driven implementation/tracking.

## Technical Decisions
- Plan only: update the implementation plan so survey work begins after `crisp-eagle` is merged into `feat/effect-migration`.
- Current repo facts: `crisp-eagle` already contains the Astro docs app and survey scaffolds under `apps/docs/src/pages/survey.astro`, `apps/docs/src/pages/api/survey/launch.ts`, and `apps/docs/src/pages/api/survey/webhook.ts`; these become prerequisites, not immediate implementation targets.
- New working assumption: testing the survey should default to stub/test-mode behaviors, preview deployments, and non-production provider credentials or mock launch paths so monthly Formbricks response quotas are not consumed during implementation.

## Research Findings
- `crisp-eagle` current HEAD: `059efc0031 docs: add Chiron brand icon and step type icons`
- `feat/effect-migration` exists locally/remotely in `crisp-eagle` and currently points to `9350c8f5a2`.
- `crisp-eagle` has substantial uncommitted docs migration changes already present, including Astro docs files and survey scaffolds.
- User intends to finish and commit those docs changes first, then merge them into `feat/effect-migration`, then implement survey work last.

## Open Questions
- After the docs merge lands on `feat/effect-migration`, should the survey implementation itself be one stack across both hosted docs and app/runtime integration, or still staged in hosted/docs-first waves?
- Exact BMAD seed extension points and story/agent tracking references are being explored before final plan revision.

## Scope Boundaries
- INCLUDE: post-merge survey implementation strategy, prerequisites from crisp-eagle, survey config files as code artifacts.
- EXCLUDE: executing the implementation or cherry-picks in this planning session.
