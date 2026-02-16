# Artifact System Technical Specification

> **STATUS: ARCHIVED / SUPERSEDED**
>
> This document describes a legacy artifact design and is retained as historical context.
> It is not the current source of truth for implementation. Prefer active architecture and package-level docs.

**Version:** 1.0  
**Date:** 2026-01-08  
**Status:** Design Document for BMAD Implementation  
**Depends On:** schema-design.md, chiron-stack-research.md

---

## Overview

Artifacts are the **living documents** that Chiron workflows produce and consume. They represent the structured outputs of PM workflows: PRDs, Architecture docs, Epics, Stories, Tech Specs, Brainstorming sessions, etc.

### Core Principles

1. **Artifacts are pseudo-files** - Live in DB during editing, become real files on publish
2. **Templates + Variables** - Artifacts are rendered views, not static documents
3. **Versioned at meaningful points** - Not every variable change, but explicit publishes
4. **Referenced by version** - Downstream workflows pin to specific artifact versions
5. **Diffable** - Full diff/patch support between versions

---

## Artifact Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARTIFACT LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │  TEMPLATE   │  workflowTemplates table                                   │
│  │  (static)   │  Handlebars template + expected variables                  │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ Workflow creates artifact                                         │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │   DRAFT     │  projectArtifacts (status: draft)                          │
│  │  (DB only)  │  • Linked to execution + variables                         │
│  │             │  • Resolves on-the-fly when viewed                         │
│  │             │  • No filesystem presence                                  │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ User/workflow publishes                                           │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │  PUBLISHED  │  artifactSnapshots (version: N)                            │
│  │ (DB + file) │  • Resolved content frozen                                 │
│  │             │  • Written to filesystem (docs/{name}.md)                  │
│  │             │  • Git commit created                                      │
│  │             │  • Can be referenced by other workflows                    │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         │ Course correct / update                                           │
│         ▼                                                                   │
│  ┌─────────────┐                                                            │
│  │  UPDATING   │  Back to draft-like state                                  │
│  │  (new ver)  │  • Load from latest published                              │
│  │             │  • Make changes via chat/tools                             │
│  │             │  • Diff shown against previous version                     │
│  │             │  • On approve → new version published                      │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema

### projectArtifacts

The artifact instance belonging to a project.

| Column          | Type                         | Notes                                                |
| --------------- | ---------------------------- | ---------------------------------------------------- |
| id              | UUID PK                      |                                                      |
| projectId       | UUID FK → projects           |                                                      |
| templateId      | UUID FK → workflowTemplates  | Which template to render                             |
| executionId     | UUID FK → workflowExecutions | Which execution created/owns this                    |
| stepExecutionId | UUID FK → stepExecutions     | Which step created this                              |
| name            | TEXT                         | "prd-v1", "architecture", "epic-1"                   |
| artifactType    | TEXT                         | "prd", "architecture", "epic", "story", "brainstorm" |
| status          | ENUM                         | draft, published, archived                           |
| currentVersion  | INTEGER                      | Latest published version (0 = never published)       |
| filePath        | TEXT                         | Set when published: "docs/prd.md"                    |
| gitCommitHash   | TEXT                         | Latest publish commit                                |
| metadata        | JSONB                        | Additional data                                      |
| createdAt       | TIMESTAMP                    |                                                      |
| updatedAt       | TIMESTAMP                    |                                                      |

### artifactSnapshots

Immutable published versions.

| Column           | Type                       | Notes                                         |
| ---------------- | -------------------------- | --------------------------------------------- |
| id               | UUID PK                    |                                               |
| artifactId       | UUID FK → projectArtifacts |                                               |
| version          | INTEGER                    | 1, 2, 3...                                    |
| resolvedContent  | TEXT                       | Full rendered markdown/content                |
| variableSnapshot | JSONB                      | Record<string, VariableValue> at publish time |
| filePath         | TEXT                       | Where written: "docs/prd.md"                  |
| gitCommitHash    | TEXT                       | Git commit for this version                   |
| publishedBy      | TEXT                       | User ID or "workflow"                         |
| publishNote      | TEXT                       | "Initial PRD", "Added Redis to tech stack"    |
| createdAt        | TIMESTAMP                  |                                               |

**Unique constraint:** (artifactId, version)

### workflowTemplates

The Handlebars templates that define artifact structure.

| Column            | Type        | Notes                                   |
| ----------------- | ----------- | --------------------------------------- |
| id                | UUID PK     |                                         |
| name              | TEXT UNIQUE | "prd-template", "brainstorming-session" |
| displayName       | TEXT        |                                         |
| artifactType      | TEXT        | "prd", "epic", etc.                     |
| template          | TEXT        | Handlebars template content             |
| templateVariables | JSONB       | TemplateVariable[] - expected inputs    |
| createdAt         | TIMESTAMP   |                                         |
| updatedAt         | TIMESTAMP   |                                         |

---

## Variable Reference in Artifacts

When a workflow creates an artifact, it doesn't copy variable values - it creates a **binding** to the execution's variables.

### Resolution Flow

```typescript
// On artifact view (draft mode)
async function resolveArtifact(artifactId: string): Promise<string> {
  const artifact = await getArtifact(artifactId);
  const template = await getTemplate(artifact.templateId);
  const variables = await getExecutionVariables(artifact.executionId);

  // Handlebars resolution
  return Handlebars.compile(template.template)(variables);
}

// On artifact publish
async function publishArtifact(artifactId: string, publishNote: string): Promise<ArtifactSnapshot> {
  const artifact = await getArtifact(artifactId);
  const variables = await getExecutionVariables(artifact.executionId);
  const resolvedContent = await resolveArtifact(artifactId);

  // Create snapshot
  const version = artifact.currentVersion + 1;
  const snapshot = await db.insert(artifactSnapshots).values({
    artifactId,
    version,
    resolvedContent,
    variableSnapshot: variables, // Freeze variable state
    publishNote,
    publishedBy: getCurrentUser(),
  });

  // Write to filesystem
  const filePath = `docs/${artifact.name}.md`;
  await writeFile(filePath, resolvedContent);

  // Git commit
  const commitHash = await gitCommit(
    filePath,
    `Publish ${artifact.name} v${version}: ${publishNote}`,
  );

  // Update artifact
  await db
    .update(projectArtifacts)
    .set({
      status: "published",
      currentVersion: version,
      filePath,
      gitCommitHash: commitHash,
    })
    .where(eq(projectArtifacts.id, artifactId));

  return snapshot;
}
```

---

## Artifact References in Variables

When a workflow uses an artifact as input, it stores a **versioned reference**.

### VariableValue Type for Artifacts

```typescript
type ArtifactRefValue = {
  type: "artifact_ref";
  artifactId: string;
  snapshotVersion: number | null;  // null = live (current draft), number = pinned version
}

// Examples:
// During PRD creation (live binding to draft):
{ type: "artifact_ref", artifactId: "prd-001", snapshotVersion: null }

// Epic references published PRD v1:
{ type: "artifact_ref", artifactId: "prd-001", snapshotVersion: 1 }

// After PRD update, new epics reference v2:
{ type: "artifact_ref", artifactId: "prd-001", snapshotVersion: 2 }
```

### Querying Dependents

```typescript
// Find all things that depend on PRD v1
async function findArtifactDependents(artifactId: string, version: number) {
  // Find variables that reference this artifact version
  const dependentVars = await db.query.variables.findMany({
    where: sql`
      current_value->>'type' = 'artifact_ref' 
      AND current_value->>'artifactId' = ${artifactId}
      AND (current_value->>'snapshotVersion')::int = ${version}
    `,
  });

  // Get the executions those variables belong to
  const executionIds = [...new Set(dependentVars.map((v) => v.executionId))];

  return {
    variables: dependentVars,
    executions: await getExecutions(executionIds),
  };
}
```

---

## Diff System

### Libraries

| Library          | Purpose                           | Install                  |
| ---------------- | --------------------------------- | ------------------------ |
| `diff` (jsdiff)  | Generate text diffs, patches      | `bun add diff`           |
| `@pierre/diffs`  | Render diffs in UI                | `bun add @pierre/diffs`  |
| `isomorphic-git` | Git operations (publish, history) | `bun add isomorphic-git` |

### Diff Generation

```typescript
import { diffLines, createPatch } from "diff";

// Compare two artifact versions
function diffArtifactVersions(
  oldContent: string,
  newContent: string,
  oldVersion: number,
  newVersion: number,
): DiffResult {
  // Line-by-line diff
  const changes = diffLines(oldContent, newContent);

  // Unified patch format
  const patch = createPatch(
    "artifact.md",
    oldContent,
    newContent,
    `v${oldVersion}`,
    `v${newVersion}`,
  );

  return { changes, patch };
}

// Compare current draft to last published
async function diffDraftToPublished(artifactId: string): Promise<DiffResult | null> {
  const artifact = await getArtifact(artifactId);

  if (artifact.currentVersion === 0) {
    return null; // Never published, nothing to diff against
  }

  const lastSnapshot = await getSnapshot(artifactId, artifact.currentVersion);
  const currentContent = await resolveArtifact(artifactId);

  return diffArtifactVersions(
    lastSnapshot.resolvedContent,
    currentContent,
    artifact.currentVersion,
    artifact.currentVersion + 1, // Draft version
  );
}
```

### Diff Visualization (React)

```typescript
import { Differ, DiffViewer } from '@pierre/diffs';

function ArtifactDiffView({ artifactId }: { artifactId: string }) {
  const { data: diff } = trpc.artifacts.getDiff.useQuery({ artifactId });

  if (!diff) return <div>No changes to show</div>;

  const differ = new Differ({
    oldFile: {
      name: `v${diff.oldVersion}`,
      content: diff.oldContent
    },
    newFile: {
      name: `v${diff.newVersion} (draft)`,
      content: diff.newContent
    },
  });

  return (
    <DiffViewer
      diff={differ}
      view="split"              // or "stacked"
      highlighting="word"       // word-level highlighting
      theme="github-dark"       // Shiki theme
      lineNumbers={true}
      lineWrapping={true}
    />
  );
}
```

### Accept/Reject Changes (Course Correct)

`@pierre/diffs` supports line selection and accept/reject. For course correction:

```typescript
function CourseCorrectDiffView({ artifactId, onPublish }: Props) {
  const [selectedChanges, setSelectedChanges] = useState<Set<number>>(new Set());

  // ... diff setup ...

  return (
    <div>
      <DiffViewer
        diff={differ}
        view="split"
        onLineSelect={(lineNumber, selected) => {
          // Track which changes user accepts
          const next = new Set(selectedChanges);
          if (selected) next.add(lineNumber);
          else next.delete(lineNumber);
          setSelectedChanges(next);
        }}
      />

      <div className="actions">
        <Button onClick={() => applySelectedChanges(selectedChanges)}>
          Apply Selected Changes
        </Button>
        <Button onClick={() => publishWithAllChanges()}>
          Publish All Changes
        </Button>
        <Button variant="outline" onClick={() => discardDraft()}>
          Discard Changes
        </Button>
      </div>
    </div>
  );
}
```

---

## Course Correct Workflow Integration

### Update Artifact Tool

For the correct-course workflow to modify existing artifacts:

```typescript
const updateArtifactTool = {
  name: "update_artifact",
  description:
    "Modify an existing artifact's content by updating variables or applying direct edits",
  toolType: "artifact-mutation",
  parameters: z.object({
    artifactId: z.string().describe("ID of the artifact to update"),
    updates: z.array(
      z.object({
        type: z.enum(["variable", "direct"]),
        // For variable updates:
        variableName: z.string().optional(),
        variableValue: z.unknown().optional(),
        // For direct edits:
        section: z.string().optional(), // Which part to edit
        newContent: z.string().optional(),
      }),
    ),
    rationale: z.string().describe("Why this change is being made"),
  }),
  requiresApproval: true, // User must approve artifact changes

  execute: async (params, context) => {
    const { artifactId, updates, rationale } = params;

    // Apply variable updates
    for (const update of updates) {
      if (update.type === "variable" && update.variableName) {
        await updateVariable(context.executionId, update.variableName, update.variableValue, {
          source: "agent_tool",
          rationale,
        });
      }
    }

    // Get diff
    const diff = await diffDraftToPublished(artifactId);

    return {
      success: true,
      diff: diff?.patch,
      message: `Updated artifact. ${diff ? "Changes ready for review." : "No previous version to compare."}`,
    };
  },
};
```

### Find Dependents Tool

```typescript
const findDependentsTool = {
  name: "find_artifact_dependents",
  description: "Find workflows, epics, stories that depend on a specific artifact version",
  toolType: "query",
  parameters: z.object({
    artifactId: z.string(),
    version: z.number().optional().describe("Specific version, or latest if omitted"),
  }),

  execute: async (params) => {
    const version = params.version ?? (await getArtifact(params.artifactId)).currentVersion;
    const dependents = await findArtifactDependents(params.artifactId, version);

    return {
      version,
      dependentCount: dependents.variables.length,
      executions: dependents.executions.map((e) => ({
        id: e.id,
        workflowName: e.workflow.name,
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  },
};
```

### Mark Stale Tool

```typescript
const markStaleTool = {
  name: "mark_dependent_stale",
  description: "Mark downstream artifacts/executions as stale after an upstream change",
  toolType: "artifact-mutation",
  parameters: z.object({
    sourceArtifactId: z.string(),
    sourceVersion: z.number(),
    newVersion: z.number(),
    reason: z.string(),
  }),

  execute: async (params) => {
    const dependents = await findArtifactDependents(params.sourceArtifactId, params.sourceVersion);

    // Mark dependent artifacts as needing review
    for (const variable of dependents.variables) {
      await db
        .update(variables)
        .set({
          metadata: sql`jsonb_set(
            COALESCE(metadata, '{}'),
            '{staleReason}',
            ${JSON.stringify(`Source artifact updated: v${params.sourceVersion} → v${params.newVersion}. ${params.reason}`)}
          )`,
        })
        .where(eq(variables.id, variable.id));
    }

    return {
      markedStale: dependents.variables.length,
      executions: dependents.executions.map((e) => e.id),
    };
  },
};
```

---

## Artifact Types & Templates

### Standard Artifact Types

| Type           | Template              | Produced By                  | Key Variables                                                |
| -------------- | --------------------- | ---------------------------- | ------------------------------------------------------------ |
| `prd`          | prd-template          | create-prd workflow          | project_name, goals, requirements, constraints               |
| `architecture` | architecture-template | create-architecture workflow | project_name, tech_stack, decisions, diagrams                |
| `epic`         | epic-template         | create-epics workflow        | prd_ref, epic_number, title, stories                         |
| `story`        | story-template        | create-story workflow        | epic_ref, story_id, user_story, acceptance_criteria, gherkin |
| `tech-spec`    | tech-spec-template    | create-tech-spec workflow    | architecture_ref, component, implementation_details          |
| `brainstorm`   | brainstorm-template   | brainstorming workflow       | session_topic, stated_goals, techniques, captured_ideas      |

### Template Example: Brainstorming Session

```handlebars
# Brainstorming Session:
{{session_topic}}

**Date:**
{{_system.date}}
**Techniques Used:**
{{#each selected_techniques}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}

## Goals

{{#each stated_goals}}
  -
  {{this}}
{{/each}}

## Ideas Captured

{{#each captured_ideas}}
  ###
  {{this.technique}}

  {{#if this.substitute}}
    #### Substitute
    {{#each this.substitute}}
      -
      {{this}}
    {{/each}}
  {{/if}}

  {{#if this.combine}}
    #### Combine
    {{#each this.combine}}
      -
      {{this}}
    {{/each}}
  {{/if}}

  {{! ... other SCAMPER sections ... }}

  {{#if this.white_facts}}
    #### White Hat (Facts)
    {{#each this.white_facts}}
      -
      {{this}}
    {{/each}}
  {{/if}}

  {{! ... other Six Hats sections ... }}

{{/each}}

## Summary

{{#if synthesis}}
  {{synthesis}}
{{else}}
  *Synthesis to be generated*
{{/if}}
```

---

## Git Integration

### On Publish

```typescript
import git from "isomorphic-git";
import * as fs from "fs";

async function publishToGit(
  projectPath: string,
  filePath: string,
  content: string,
  commitMessage: string,
): Promise<string> {
  // Write file
  const fullPath = path.join(projectPath, filePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, content, "utf-8");

  // Stage
  await git.add({ fs, dir: projectPath, filepath: filePath });

  // Commit
  const sha = await git.commit({
    fs,
    dir: projectPath,
    message: commitMessage,
    author: {
      name: "Chiron",
      email: "chiron@local",
    },
  });

  return sha;
}
```

### Version History from Git

```typescript
async function getArtifactHistory(projectPath: string, filePath: string): Promise<GitLogEntry[]> {
  const commits = await git.log({
    fs,
    dir: projectPath,
    filepath: filePath,
  });

  return commits.map((c) => ({
    sha: c.oid,
    message: c.commit.message,
    author: c.commit.author.name,
    date: new Date(c.commit.author.timestamp * 1000),
  }));
}

// Get content at specific version
async function getArtifactAtVersion(
  projectPath: string,
  filePath: string,
  commitSha: string,
): Promise<string> {
  const { blob } = await git.readBlob({
    fs,
    dir: projectPath,
    oid: commitSha,
    filepath: filePath,
  });

  return new TextDecoder().decode(blob);
}
```

---

## API Endpoints (tRPC)

```typescript
// packages/api/src/routers/artifacts.ts

export const artifactsRouter = router({
  // Get artifact (resolved if draft)
  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const artifact = await getArtifact(input.id);
    const content =
      artifact.status === "draft"
        ? await resolveArtifact(input.id)
        : (await getLatestSnapshot(input.id)).resolvedContent;
    return { artifact, content };
  }),

  // Get specific version
  getVersion: publicProcedure
    .input(z.object({ id: z.string(), version: z.number() }))
    .query(async ({ input }) => {
      return getSnapshot(input.id, input.version);
    }),

  // Get diff (draft vs published)
  getDiff: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return diffDraftToPublished(input.id);
  }),

  // Compare two versions
  compareVersions: publicProcedure
    .input(
      z.object({
        id: z.string(),
        fromVersion: z.number(),
        toVersion: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const from = await getSnapshot(input.id, input.fromVersion);
      const to = await getSnapshot(input.id, input.toVersion);
      return diffArtifactVersions(
        from.resolvedContent,
        to.resolvedContent,
        input.fromVersion,
        input.toVersion,
      );
    }),

  // Publish artifact
  publish: publicProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return publishArtifact(input.id, input.note);
    }),

  // Find dependents
  findDependents: publicProcedure
    .input(
      z.object({
        id: z.string(),
        version: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const version = input.version ?? (await getArtifact(input.id)).currentVersion;
      return findArtifactDependents(input.id, version);
    }),

  // List versions
  listVersions: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.query.artifactSnapshots.findMany({
      where: eq(artifactSnapshots.artifactId, input.id),
      orderBy: [desc(artifactSnapshots.version)],
    });
  }),
});
```

---

## Open Questions

1. **Template editing** - Can users edit templates, or are they fixed per artifact type?

2. **Direct content edits** - Should users be able to edit artifact content directly (outside of variables), or is everything through variables?

3. **Conflict resolution** - If two workflows try to update the same artifact, how do we handle it?

4. **Archive behavior** - What happens to dependents when an artifact is archived?

5. **Migration** - How do we migrate existing artifacts from the old system?

---

## Dependencies

- `diff` - Text diffing
- `@pierre/diffs` - Diff visualization
- `isomorphic-git` - Git operations
- `handlebars` - Template rendering (already in use)

---

## Related Documents

- [Schema Design](../schema-design.md) - Database schema
- [Chiron Stack Research](../../_bmad-output/planning-artifacts/research/chiron-stack-research.md) - Overall architecture
