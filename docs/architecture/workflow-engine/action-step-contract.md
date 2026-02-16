# Action Step Contract

This document defines the action step schema and behavior.

## Purpose

Action steps execute deterministic mutations that don't require LLM or user input. They operate on collected variables and produce concrete side effects.

## What belongs in action step

- Saving snapshots of artifacts
- Creating/updating artifacts from templates
- Creating directories
- Git operations (commit, branch, worktree, push, etc.)
- File operations (copy, move, delete)
- Environment variable setup
- Execution variable updates

## What does NOT belong in action step

- LLM generation -> agent step
- User input collection -> form step
- Conditional routing -> branch step
- Read-only rendering -> display step
- Child workflow orchestration -> invoke step

## ActionStepConfig

```ts
type ActionStepConfig = {
  type: "action"
  id: string
  title?: string
  message?: string
  
  actions: ActionConfig[]
  
  // Execution strategy
  stopOnError?: boolean  // default true (fail-fast), false = continue others
  
  // Outputs
  outputVariables?: string[]
}
```

## ActionConfig (base)

```ts
type ActionConfig = {
  id: string  // required for dependency resolution
  kind: "snapshot" | "artifact" | "directory" | "git" | "env" | "file" | "variable"
  operation: string
  dependsOn?: string[]  // action ids that must complete first
  requiresApproval?: boolean
  outputVariable?: string
  // ...kind-specific params
}
```

## Execution model

- Actions with no `dependsOn` (or `dependsOn: []`) can start immediately
- Actions with `dependsOn` wait until those complete
- Actions with same dependencies can run in parallel
- This forms a DAG naturally

Effect patterns:
- `stopOnError: true` -> `Effect.all` (fails on first error)
- `stopOnError: false` -> `Effect.allSettled` (run all, collect failures)
- Independent actions continue even if unrelated actions fail

---

## Action kinds

### 1. snapshot

Save immutable artifact version.

```ts
{
  id: "snapshot-prd",
  kind: "snapshot",
  artifactId: "{{prd_artifact_id}}",
  label: "v1.0-approved",
  outputVariable: "prd_snapshot_id"
}
```

### 2. artifact

Create or update artifacts with template mapping.

```ts
// Create from template
{
  id: "create-story",
  kind: "artifact",
  operation: "create",
  template: "story-template",
  variables: {
    title: "{{story_title}}",
    description: "{{story_description}}",
    acceptance_criteria: "{{acceptance_criteria}}"
  },
  name: "{{story_name}}",
  artifactType: "story",
  outputVariable: "story_artifact_id"
}

// Update existing
{
  id: "update-prd",
  kind: "artifact",
  operation: "update",
  artifactId: "{{prd_artifact_id}}",
  content: "{{updated_prd_content}}"
}
```

### 3. directory

Create folders.

```ts
{
  id: "create-feature-dir",
  kind: "directory",
  operation: "create",
  path: "{{repo_path}}/src/features/{{feature_name}}",
  outputVariable: "feature_dir_path"
}

{
  id: "ensure-docs-dir",
  kind: "directory",
  operation: "ensure",  // creates if not exists
  path: "{{repo_path}}/docs/stories"
}
```

### 4. env

Set environment variables for worktree.

```ts
{
  id: "setup-env",
  kind: "env",
  operation: "set",
  worktreePath: "{{worktree_path}}",
  variables: {
    "OPENCODE_PROJECT": "{{project_name}}",
    "CHIRON_EXECUTION_ID": "{{execution_id}}",
    "CHIRON_STORY_ID": "{{story_id}}"
  }
}

{
  id: "cleanup-env",
  kind: "env",
  operation: "unset",
  worktreePath: "{{worktree_path}}",
  keys: ["CHIRON_EXECUTION_ID", "CHIRON_STORY_ID"]
}
```

### 5. git

All git operations including worktree management.

#### commit
```ts
{
  id: "commit-story",
  kind: "git",
  operation: "commit",
  message: "feat: {{story_title}}",
  paths: ["{{artifact_path}}"],
  requiresApproval: true,
  outputVariable: "commit_sha"
}

{
  id: "commit-all",
  kind: "git",
  operation: "commit",
  message: "{{commit_message}}",
  all: true,
  outputVariable: "commit_sha"
}
```

#### branch
```ts
{
  id: "create-feature-branch",
  kind: "git",
  operation: "branch-create",
  branch: "feature/{{story_slug}}",
  from: "main",
  outputVariable: "branch_name"
}

{
  id: "delete-branch",
  kind: "git",
  operation: "branch-delete",
  branch: "{{branch_to_delete}}"
}
```

#### checkout
```ts
{
  id: "checkout-branch",
  kind: "git",
  operation: "checkout",
  branch: "{{branch_name}}"
}

{
  id: "checkout-new",
  kind: "git",
  operation: "checkout",
  branch: "feature/{{story_slug}}",
  create: true,
  from: "main"
}
```

#### push
```ts
{
  id: "push-branch",
  kind: "git",
  operation: "push",
  branch: "{{branch_name}}",
  remote: "origin",
  requiresApproval: true
}

{
  id: "push-with-upstream",
  kind: "git",
  operation: "push",
  branch: "{{branch_name}}",
  setUpstream: true
}
```

#### pull
```ts
{
  id: "pull-latest",
  kind: "git",
  operation: "pull",
  branch: "main",
  remote: "origin"
}

{
  id: "pull-rebase",
  kind: "git",
  operation: "pull",
  rebase: true
}
```

#### stash
```ts
{
  id: "stash-changes",
  kind: "git",
  operation: "stash-push",
  message: "WIP: {{story_title}}",
  outputVariable: "stash_ref"
}

{
  id: "restore-stash",
  kind: "git",
  operation: "stash-pop"
}
```

#### tag
```ts
{
  id: "tag-release",
  kind: "git",
  operation: "tag",
  tag: "v{{version}}",
  message: "Release {{version}}",
  requiresApproval: true
}
```

#### worktree
```ts
{
  id: "create-worktree",
  kind: "git",
  operation: "worktree-create",
  path: "{{worktrees_root}}/{{story_slug}}",
  branch: "feature/{{story_slug}}",
  baseBranch: "main",
  outputVariable: "worktree_path"
}

{
  id: "remove-worktree",
  kind: "git",
  operation: "worktree-remove",
  path: "{{worktree_path}}"
}

{
  id: "list-worktrees",
  kind: "git",
  operation: "worktree-list",
  outputVariable: "worktrees"
}
```

### 6. file

Copy, move, delete files.

```ts
{
  id: "copy-template",
  kind: "file",
  operation: "copy",
  source: "{{templates_path}}/component.tsx.template",
  destination: "{{feature_dir}}/{{component_name}}.tsx",
  overwrite: false,
  outputVariable: "component_path"
}

{
  id: "move-file",
  kind: "file",
  operation: "move",
  source: "{{old_path}}",
  destination: "{{new_path}}"
}

{
  id: "delete-temp",
  kind: "file",
  operation: "delete",
  path: "{{temp_file_path}}"
}
```

### 7. variable

Update execution variables.

```ts
{
  id: "set-status",
  kind: "variable",
  operation: "set",
  key: "project_status",
  value: "initialized"
}

{
  id: "merge-metadata",
  kind: "variable",
  operation: "merge",
  key: "project_metadata",
  values: {
    "initialized_at": "{{timestamp}}",
    "initialized_by": "{{user_id}}",
    "workflow_path": "{{selected_workflow_path}}"
  }
}

{
  id: "clear-temp",
  kind: "variable",
  operation: "delete",
  key: "temp_data"
}
```

---

## Full example: workflow-init action step with dependencies

```ts
{
  type: "action",
  id: "setup-project",
  title: "Initialize project structure",
  actions: [
    {
      id: "create-root",
      kind: "directory",
      operation: "create",
      path: "{{repo_path}}/{{project_name}}",
      outputVariable: "project_root"
    },
    {
      id: "create-docs",
      kind: "directory",
      operation: "create",
      path: "{{project_root}}/docs",
      dependsOn: ["create-root"]
    },
    {
      id: "create-src",
      kind: "directory",
      operation: "create",
      path: "{{project_root}}/src",
      dependsOn: ["create-root"]
    },
    {
      id: "create-worktree",
      kind: "git",
      operation: "worktree-create",
      path: "{{worktrees_root}}/{{project_name}}",
      branch: "main",
      dependsOn: ["create-root"],
      outputVariable: "worktree_path"
    },
    {
      id: "setup-env",
      kind: "env",
      operation: "set",
      worktreePath: "{{worktree_path}}",
      variables: {
        "CHIRON_PROJECT": "{{project_name}}"
      },
      dependsOn: ["create-worktree"]
    },
    {
      id: "set-initialized",
      kind: "variable",
      operation: "set",
      key: "project_initialized",
      value: true,
      dependsOn: ["create-docs", "create-src", "setup-env"]
    }
  ],
  stopOnError: true
}
```

---

## Deferred actions (future consideration)

- `webhook` - HTTP/API calls to external services
- `script` - Shell/script execution with sandboxing
- `notify` - Send notifications to user
