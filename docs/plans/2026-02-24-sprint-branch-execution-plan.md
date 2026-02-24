# Sprint Branching and Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the current 7-epic sprint with safe parallelism, isolated worktrees, and predictable merges to `main`.

**Architecture:** Use one story branch per story and one worktree per active branch. Keep dependency-sensitive stories sequential and run independent stories in parallel waves. Use optional epic integration branches to reduce merge risk before promoting to `main`.

**Tech Stack:** Git, git worktree, BMAD sprint-status tracking, story-driven workflow (`create-story` -> `dev-story` -> `code-review`).

---

### Task 1: Establish Branching and Worktree Conventions

**Files:**
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Reference: `docs/plans/2026-02-24-sprint-branch-execution-plan.md`

**Step 1: Use canonical branch naming**

- Format: `story/<epic>-<story>-<short-slug>`
- Example: `story/1-1-methodology-draft-baseline`

**Step 2: Use one worktree per active story branch**

- Suggested location pattern: `../chiron-wt/<branch-name>`

**Step 3: Keep commits story-scoped and atomic**

- Commit only files tied to the active story acceptance criteria.

### Task 2: Define Parallel Execution Waves

**Files:**
- Reference: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Reference: `_bmad-output/planning-artifacts/epics.md`

**Step 1: Run Wave 1 (Epic 1 foundation)**

- Sequential start: `1.1`
- Parallel after `1.1`: `1.2` + `1.3`
- Sequential close: `1.4` -> `1.5`

**Step 2: Run Wave 2 (Epic 2 workbench)**

- Parallel: `2.1` + `2.2`
- Then `2.3`
- Parallel close: `2.4` + `2.5`

**Step 3: Run Wave 3 (Epic 3 runtime spikes)**

- Parallel: `3.1` + `3.2` + `3.3`
- Then `3.4`
- Then `3.5`

**Step 4: Run Wave 4 and Wave 5 mostly sequential**

- Wave 4: `4.1` -> `4.2` -> `4.3` -> `4.4`
- Wave 5: `5.1` -> `5.2` -> `5.3` -> `5.4` -> `5.5` -> `5.6` -> `5.7`

**Step 5: Run Wave 6 and Wave 7 with controlled parallelism**

- Wave 6: `6.1` + `6.2` + `6.3` parallel, then `6.4`, then `6.5`
- Wave 7: `7.1` + `7.2` + `7.3` parallel, then `7.4`, then `7.5`, then `7.6`

### Task 3: Create Branch and Worktree for Story 1.1

**Files:**
- Create: story file via BMAD `create-story` output in `_bmad-output/implementation-artifacts/`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Create story branch**

```bash
git checkout -b story/1-1-methodology-draft-baseline
```

**Step 2: Create isolated worktree for implementation**

```bash
git worktree add ../chiron-wt/story-1-1 story/1-1-methodology-draft-baseline
```

**Step 3: Run story lifecycle**

- Use BMAD flow: `create-story` -> `dev-story` -> `code-review`.
- Update story status through `ready-for-dev` -> `in-progress` -> `review` -> `done`.

### Task 4: Merge and Promotion Policy

**Files:**
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Merge story branch only after review**

- Require story status at least `review` before merge candidate.

**Step 2: Optional epic integration branch for parallel stories**

- Branch format: `epic/<n>-integration`
- Use for conflict resolution across sibling story branches.

**Step 3: Promote to main with clean checks**

- Ensure test/check commands pass before `main` merge.

### Task 5: Operate Sprint Tracker Continuously

**Files:**
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Update statuses at each lifecycle transition**

- Story statuses move forward only; never downgrade.

**Step 2: Keep epic state aligned with story progress**

- `in-progress` when any story is beyond backlog.
- `done` only when all epic stories are done.

**Step 3: Record retrospective completion when finished**

- Set `epic-<n>-retrospective: done` when completed.
