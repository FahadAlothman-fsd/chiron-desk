# Epic 3 OpenCode Agents (Project + System) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add safe discovery + UI selection of OpenCode agents from `{repo-worktree}/.opencode/agents` and `{opencodeHome}/agents`, and prepare Epic 3 execution surfaces to run OpenCode agents with a single security/permission boundary.

**Architecture:** Extend project persistence to include a repo root path, implement a backend `OpenCodeAgentCatalogService` (scan + parse frontmatter + cache), expose a protected oRPC endpoint to list agents, and build a tabbed web UI surface plus a reusable agent picker component. All path handling is sandbox-rooted and enforced with `realpath` prefix checks.

**Tech Stack:** TypeScript, Bun, Turbo, Vitest, Effect, Drizzle (SQLite/libSQL), TanStack Router, React Query, oRPC.

---

### Task 1: Add persisted project repo root path (DB + repository types)

**Files:**
- Modify: `packages/db/src/schema/project.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/db/src/methodology-repository.integration.test.ts`

**Step 1: Write failing integration test**

Add a test that:
- creates a project
- asserts `repoRootPath` is `null`
- updates `repoRootPath`
- re-reads project and asserts it matches

Skeleton (adjust to existing repo test harness patterns):

```ts
it("persists repo root path on projects", async () => {
  const repo = await makeRepo();
  const created = await Effect.runPromise(repo.createProject({ projectId: "p1" }));
  expect(created.repoRootPath).toBeNull();

  await Effect.runPromise(repo.setProjectRepoRootPath({ projectId: "p1", repoRootPath: "/tmp/repo" }));
  const loaded = await Effect.runPromise(repo.getProjectById({ projectId: "p1" }));
  expect(loaded?.repoRootPath).toBe("/tmp/repo");
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/db/src/methodology-repository.integration.test.ts`
Expected: FAIL because `repoRootPath` does not exist.

**Step 3: Implement schema + repository changes (minimal)**

- Add nullable column on `projects`:
  - `repoRootPath: text("repo_root_path")` (nullable)
- Extend `ProjectRow` in `packages/methodology-engine/src/repository.ts` to include:
  - `repoRootPath: string | null`
- Add a new repository method:

```ts
setProjectRepoRootPath: (params: { projectId: string; repoRootPath: string }) => Effect.Effect<void, RepositoryError>
```

- Update `packages/db/src/methodology-repository.ts`:
  - include `repo_root_path` in `toProjectRow`
  - implement `setProjectRepoRootPath` using `update(projects).set({ repoRootPath }).where(eq(projects.id, projectId))`

**Step 4: Generate/push DB changes**

Run (choose one per repo convention):
- `bun run db:generate` (if migrations are used)
- `bun run db:push` (for local dev)

Expected: Drizzle updates the schema without errors.

**Step 5: Run tests to verify pass**

Run: `bun test packages/db/src/methodology-repository.integration.test.ts`
Expected: PASS.

---

### Task 2: Add API to set repo root path (validated, protected)

**Files:**
- Modify: `packages/api/src/routers/project.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/api/src/routers/project.test.ts` (or add if missing)

**Step 1: Add a failing API test**

Add a test that calls a new procedure:
- `orpc.project.setRepoRootPath({ projectId, repoRootPath })`
- expects success
- then `getProjectDetails` includes the repo path (additive field) OR re-load via service and assert.

**Step 2: Implement service method**

In `packages/methodology-engine/src/version-service.ts`, add:

```ts
readonly setProjectRepoRootPath: (
  input: { projectId: string; repoRootPath: string },
  actorId: string | null,
) => Effect.Effect<void, RepositoryError | VersionNotFoundError>
```

Implementation uses repository `setProjectRepoRootPath`.

**Step 3: Add router endpoint**

In `packages/api/src/routers/project.ts`:
- Add `protectedProcedure.input(z.object({ projectId: z.string().min(1), repoRootPath: z.string().min(1) }))`
- Validate `repoRootPath` conservatively:
  - must be absolute
  - must not contain NUL
  - must not end with `/.git` (store root, not git dir)

Return a minimal `{ ok: true }`.

**Step 4: Run API tests**

Run: `bun test packages/api`
Expected: PASS.

---

### Task 3: Add OPENCODE_HOME server config (app-controlled)

**Files:**
- Modify: `packages/env/src/server.ts`

**Step 1: Add env var**

Add:

```ts
OPENCODE_HOME: z.string().min(1),
```

**Step 2: Add documentation note in plan (no code)**

For local dev, set `OPENCODE_HOME` to a directory that contains `agents/`.

**Step 3: Run typecheck**

Run: `bun run check-types`
Expected: PASS.

---

### Task 4: Implement OpenCodeAgentCatalogService (scan + parse + merge + cache)

**Files:**
- Create: `packages/api/src/services/opencode-agent-catalog/service.ts`
- Create: `packages/api/src/services/opencode-agent-catalog/frontmatter.ts`
- Create: `packages/api/src/services/opencode-agent-catalog/types.ts`
- Test: `packages/api/src/services/opencode-agent-catalog/service.test.ts`

**Step 1: Write failing unit tests**

Cover:
- parses frontmatter `mode` + `description` from `.md` file
- merges duplicates with project precedence
- sorts deterministically
- ignores unreadable files without throwing

Example test fixture content:

```md
---
mode: all
description: 'dev agent'
---

Body...
```

**Step 2: Implement minimal parser**

In `frontmatter.ts`, implement a tolerant parser:
- if file starts with `---` and contains a second `---`, parse key/value pairs line-by-line
- keep only `mode` and `description`
- never eval YAML; treat as plain text

**Step 3: Implement scanner**

In `service.ts`:
- inputs: `{ worktreePath: string, opencodeHome: string, nowMs: number }`
- project root glob: `${worktreePath}/.opencode/agents/**/*.md`
- system root glob: `${opencodeHome}/agents/**/*.md`
- compute `contentHash` (sha256 of bytes)
- `updatedAtMs` from stat mtime
- merge by `agentId` (derive from basename without `.md`) with precedence
- cache results in-memory with a TTL (start with 10s)

**Step 4: Run unit tests**

Run: `bun test packages/api/src/services/opencode-agent-catalog/service.test.ts`
Expected: PASS.

---

### Task 5: Add oRPC router to list OpenCode agents for a project

**Files:**
- Create: `packages/api/src/routers/opencode-agents.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Write failing router test**

Call `orpc.opencodeAgents.list({ projectId, q, source })` and expect:
- entries include project `.opencode/agents/*.md`
- entries include system agents from `OPENCODE_HOME/agents/*.md`
- filtering works

**Step 2: Implement router**

- Use `protectedProcedure`.
- Load project repo root path via `MethodologyVersionService.getProjectById` (extend to return repoRootPath or add a dedicated method).
- Call `OpenCodeAgentCatalogService.listForProject({ worktreePath: repoRootPath, opencodeHome: env.OPENCODE_HOME })`.
- Apply server-side filters:
  - `q` (case-insensitive contains)
  - `source` tab (project|system|builtin)

Return `OpenCodeAgentCatalogEntry[]`.

**Step 3: Run API tests**

Run: `bun test packages/api`
Expected: PASS.

---

### Task 6: Add a project UI surface to browse OpenCode agents

**Files:**
- Create: `apps/web/src/routes/projects.$projectId.opencode-agents.tsx`
- Create: `apps/web/src/features/opencode-agents/agent-list.tsx`

**Step 1: Implement route shell**

Match the existing list route patterns (e.g. `apps/web/src/routes/projects.$projectId.agents.tsx`):
- `q` in URL search params
- `source` in URL search params (`project|system|builtin`)

**Step 2: Implement tabs + filtering UI**

- Tabs: Project/System/Builtin
- Search input
- List cards: agentId, description, mode, source badge

**Step 3: Add loading/error/empty states**

- Loading: skeleton or text
- Error: show "Agents unavailable"
- Empty: "No OpenCode agents found" with guidance:
  - project: create `.opencode/agents/*.md`
  - system: set `OPENCODE_HOME/agents`

---

### Task 7: Add reusable agent picker component for execution surfaces

**Files:**
- Create: `apps/web/src/features/opencode-agents/agent-picker.tsx`

**Step 1: Implement picker API**

```ts
export type OpenCodeAgentPickerValue = { agentId: string; source: "project" | "system" | "builtin" };

export function OpenCodeAgentPicker(props: {
  projectId: string;
  value: OpenCodeAgentPickerValue | null;
  onChange: (next: OpenCodeAgentPickerValue) => void;
})
```

Use the same underlying `orpc.opencodeAgents.list` query.

**Step 2: Manual verification**

Run: `bun run dev:web`
Navigate: `/projects/<id>/opencode-agents`
Expected: tabs + search work.

---

### Task 8: (Epic 3 runtime hook) Enforce sandbox-rooted path boundaries for tool actions

**Files:**
- Create: `packages/tooling-engine/src/permissions/path-guard.ts`
- Modify: `packages/tooling-engine/src/index.ts`
- Test: `packages/tooling-engine/src/permissions/path-guard.test.ts`

**Step 1: Implement `isPathInsideRoot(realpathTarget, realpathRoot)`**

- Realpath both
- Ensure prefix match on path segment boundary

**Step 2: Add tests**

Cover:
- inside root
- outside root
- `..` traversal
- symlink escape

---

## Verification Checklist

Run:
- `bun run check-types`
- `bun test packages/db`
- `bun test packages/api`
- `bun run dev:web` and verify UI manually

