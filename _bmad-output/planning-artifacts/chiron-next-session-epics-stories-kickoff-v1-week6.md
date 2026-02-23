# Chiron Next Session Kickoff (Epics & Stories)

Date: 2026-02-18
Status: Ready for next session handoff
Goal: start epic/story creation from locked foundations, then execute reset and implementation.

## 1) Required Inputs for Next Session

Load and treat as canonical:

- `_bmad-output/planning-artifacts/chiron-foundational-docs-lock-v1-week6.md`
- `_bmad-output/planning-artifacts/chiron-module-lock-matrix-v1-week6.md`
- `_bmad-output/planning-artifacts/chiron-complete-schemas-v2-week6.md`
- `_bmad-output/planning-artifacts/bmad-work-unit-catalog-v1-week6.md`
- `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-resolved-v1-week6.md`
- `_bmad-output/planning-artifacts/chiron-backend-stack-lock-v1-week6.md`
- `_bmad-output/planning-artifacts/chiron-frontend-lock-v1-week6.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`

## 2) Session Objectives

1. Create fresh epics/stories for reset-based implementation (no legacy epic reuse).
2. Sequence backend-first implementation slices with hard cut lines.
3. Define Better-T-Stack reset execution story.
4. Define first vertical slice story (`WU.SETUP` + `WU.BRAINSTORMING`).
5. Define transition table migration story and seed binding story.

## 3) Story Ordering (Recommended)

1. Reset scaffold story (Better-T-Stack baseline + package topology)
2. Contracts/schema baseline story
3. Methodology-engine scaffold story
4. Transition/workflow binding persistence story
5. Brainstorming vertical slice story
6. API streaming + execution status story
7. Sandbox/tooling boundary story
8. Frontend integration stories (post-backend spine)

## 4) Guardrails for Next Session

- Do not reopen foundational lock decisions unless explicitly blocked.
- Do not add new stack technologies outside lock docs.
- Keep epics/stories mapped to work units and transitions.
- Keep gate model strictly start/completion.

## 5) Post-Epics Action Plan

After epics/stories are approved:

1. Execute archive plan.
2. Run Better-T-Stack reset.
3. Start implementation from first approved story.
