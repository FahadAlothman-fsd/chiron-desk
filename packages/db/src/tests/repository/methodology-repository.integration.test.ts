import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { createMethodologyRepoLayer } from "../../methodology-repository";
import { createProjectContextRepoLayer } from "../../project-context-repository";
import {
  methodologyAgentTypes,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
  methodologyVersions,
  methodologyWorkUnitTypes,
} from "../../schema/methodology";
import { projectExecutions, projectMethodologyPins } from "../../schema/project";
import * as schema from "../../schema";

const VALIDATION_OK: ValidationResult = {
  valid: true,
  diagnostics: [],
};

const SCHEMA_SQL = [
  `CREATE TABLE methodology_definitions (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    archived_at INTEGER
  )`,
  `CREATE TABLE methodology_versions (
    id TEXT PRIMARY KEY,
    methodology_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    display_name TEXT NOT NULL,
    definition_extensions_json TEXT,
    created_at INTEGER NOT NULL,
    retired_at INTEGER,
    UNIQUE(methodology_id, version)
  )`,
  `CREATE TABLE methodology_version_events (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT,
    changed_fields_json TEXT,
    diagnostics_json TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_work_unit_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    cardinality TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE methodology_agent_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    persona TEXT NOT NULL,
    default_model_json TEXT,
    mcp_servers_json TEXT,
    capabilities_json TEXT,
    prompt_template_json TEXT,
    prompt_template_version INTEGER NOT NULL DEFAULT 1,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE work_unit_lifecycle_states (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, key)
  )`,
  `CREATE TABLE work_unit_lifecycle_transitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    transition_key TEXT NOT NULL,
    from_state_id TEXT,
    to_state_id TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, transition_key)
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    display_name TEXT,
    metadata_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE methodology_workflow_steps (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    display_name TEXT,
    config_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(workflow_id, key)
  )`,
  `CREATE TABLE methodology_workflow_edges (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    from_step_id TEXT,
    to_step_id TEXT,
    edge_key TEXT,
    condition_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_transition_workflow_bindings (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, transition_id, workflow_id)
  )`,
  `CREATE TABLE methodology_fact_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    fact_type TEXT NOT NULL,
    default_value_json TEXT,
    description_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE methodology_artifact_slot_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    cardinality TEXT NOT NULL,
    rules_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, work_unit_type_id, key)
  )`,
  `CREATE TABLE methodology_artifact_slot_templates (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    slot_definition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    content TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(slot_definition_id, key)
  )`,
  `CREATE TABLE methodology_link_type_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    source_work_unit_type_key TEXT NOT NULL,
    target_work_unit_type_key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_methodology_pins (
    project_id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    methodology_id TEXT NOT NULL,
    methodology_key TEXT NOT NULL,
    published_version TEXT NOT NULL,
    actor_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_methodology_pin_events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT,
    previous_version TEXT,
    new_version TEXT NOT NULL,
    evidence_ref TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_executions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    methodology_version_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

describe("methodology repository integration", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-methodology-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }
  });

  afterEach(async () => {
    if (client) {
      client.close();
    }

    if (dbPath) {
      rmSync(dbPath, { force: true });
    }
  });

  const runRepo = <A>(
    fn: (repo: MethodologyRepository["Type"]) => Effect.Effect<A, unknown>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* MethodologyRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createMethodologyRepoLayer(db))),
    );

  const runRepoError = <E>(
    fn: (repo: MethodologyRepository["Type"]) => Effect.Effect<unknown, E>,
  ): Promise<E> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* MethodologyRepository;
        return yield* Effect.flip(fn(repo));
      }).pipe(Effect.provide(createMethodologyRepoLayer(db))),
    );

  const runProjectRepo = <A>(
    fn: (repo: ProjectContextRepository["Type"]) => Effect.Effect<A, unknown>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectContextRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createProjectContextRepoLayer(db))),
    );

  const createAndPublishVersion = async (
    methodologyKey: string,
    draftVersion: string,
    publishedVersion: string,
  ) => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey,
        displayName: `Methodology ${methodologyKey}`,
        version: draftVersion,
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const published = await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: created.version.id,
        publishedVersion,
        actorId: "publisher-1",
        validationSummary: VALIDATION_OK,
      }),
    );

    return published.version;
  };

  it("rejects forbidden canonical keys in draft create definition extensions", async () => {
    const error = await runRepoError((repo) =>
      repo.createDraft({
        methodologyKey: "forbidden-methodology",
        displayName: "Forbidden Methodology",
        version: "0.1.0",
        definitionExtensions: {
          workUnitTypes: [{ key: "task" }],
          transitions: [{ key: "start" }],
        },
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    expect(error).toMatchObject({
      _tag: "RepositoryError",
      code: "FORBIDDEN_EXTENSION_KEYS",
      cause: {
        diagnosticRef: "forbidden-extension-keys-diagnostics",
        scope: "definition_extensions_json",
        forbiddenKeys: ["workUnitTypes", "transitions"],
      },
    });
  });

  it("rejects forbidden canonical keys in draft update definition extensions", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "forbidden-update-methodology",
        displayName: "Forbidden Update Methodology",
        version: "0.1.0",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const error = await runRepoError((repo) =>
      repo.updateDraft({
        versionId: created.version.id,
        displayName: "Forbidden Update Methodology",
        version: "0.1.1",
        definitionExtensions: {
          agentTypes: [],
          linkTypeDefinitions: [],
        },
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        changedFieldsJson: { changed: true },
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    expect(error).toMatchObject({
      _tag: "RepositoryError",
      code: "FORBIDDEN_EXTENSION_KEYS",
      cause: {
        diagnosticRef: "forbidden-extension-keys-diagnostics",
        scope: "definition_extensions_json",
        forbiddenKeys: ["agentTypes", "linkTypeDefinitions"],
      },
    });
  });

  it("keeps canonical workflow data out of definition extensions", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "1.0.0",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const versionId = created.version.id;

    await db.insert(methodologyWorkUnitTypes).values({
      methodologyVersionId: versionId,
      key: "task",
      displayName: "Task",
      descriptionJson: null,
      cardinality: "many_per_project",
      guidanceJson: null,
    });

    await db.insert(methodologyAgentTypes).values({
      methodologyVersionId: versionId,
      key: "analyst",
      displayName: "Analyst",
      description: null,
      persona: "analysis",
      defaultModelJson: null,
      mcpServersJson: null,
      capabilitiesJson: null,
      guidanceJson: null,
    });

    await db.insert(workUnitLifecycleStates).values({
      methodologyVersionId: versionId,
      workUnitTypeId: "wu-state-owner",
      key: "new",
      displayName: "New",
      descriptionJson: null,
      guidanceJson: null,
    });

    const workUnitRows = await db
      .select({ id: methodologyWorkUnitTypes.id })
      .from(methodologyWorkUnitTypes)
      .where(eq(methodologyWorkUnitTypes.methodologyVersionId, versionId));
    const workUnitId = workUnitRows[0]?.id;
    if (!workUnitId) {
      throw new Error("Missing work unit type seed row");
    }

    await db
      .update(workUnitLifecycleStates)
      .set({ workUnitTypeId: workUnitId })
      .where(eq(workUnitLifecycleStates.methodologyVersionId, versionId));

    const stateRows = await db
      .select({ id: workUnitLifecycleStates.id })
      .from(workUnitLifecycleStates)
      .where(eq(workUnitLifecycleStates.methodologyVersionId, versionId));
    const stateId = stateRows[0]?.id;
    if (!stateId) {
      throw new Error("Missing lifecycle state seed row");
    }

    await db.insert(workUnitLifecycleTransitions).values({
      methodologyVersionId: versionId,
      workUnitTypeId: workUnitId,
      transitionKey: "start",
      fromStateId: null,
      toStateId: stateId,
      guidanceJson: null,
    });

    const guidance = {
      global: { label: "global" },
      byWorkUnitType: { task: { label: "wut" } },
      byAgentType: { analyst: { label: "agent" } },
      byTransition: { start: { label: "transition" } },
      byWorkflow: {},
    };

    await runRepo((repo) =>
      repo.updateDraft({
        versionId,
        displayName: "Foundation Methodology",
        version: "1.0.1",
        definitionExtensions: {
          guidance: { global: guidance.global },
        },
        workflows: [
          {
            key: "wf-start",
            displayName: "Workflow Start",
            workUnitTypeKey: "task",
            steps: [
              { key: "s-1", type: "action" },
              { key: "s-2", type: "display" },
            ],
            edges: [
              { fromStepKey: null, toStepKey: "s-1", edgeKey: "entry" },
              { fromStepKey: "s-1", toStepKey: "s-2", edgeKey: "next" },
              { fromStepKey: "s-2", toStepKey: null, edgeKey: "done" },
            ],
          },
        ],
        transitionWorkflowBindings: {
          start: ["wf-start"],
        },
        guidance,
        actorId: "user-1",
        changedFieldsJson: { changed: true },
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const versionRows = await db
      .select({ definitionExtensions: methodologyVersions.definitionExtensions })
      .from(methodologyVersions)
      .where(eq(methodologyVersions.id, versionId));
    const definitionExtensions = versionRows[0]?.definitionExtensions as
      | Record<string, unknown>
      | undefined;

    expect(definitionExtensions).toBeDefined();
    expect(definitionExtensions?.workflows).toBeUndefined();
    expect(definitionExtensions?.transitionWorkflowBindings).toBeUndefined();

    const snapshot = await runRepo((repo) => repo.findWorkflowSnapshot(versionId));

    expect(snapshot.workflows.map((workflow) => workflow.key)).toEqual(["wf-start"]);
    expect(snapshot.transitionWorkflowBindings).toEqual({ start: ["wf-start"] });
    expect(snapshot.guidance).toEqual({
      global: { label: "global" },
      byWorkUnitType: { task: { label: "wut" } },
      byAgentType: { analyst: { label: "agent" } },
      byTransition: { start: { label: "transition" } },
      byWorkflow: {},
    });
  });

  it("publishes a draft atomically and appends publication evidence", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "0.1.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const published = await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: created.version.id,
        publishedVersion: "1.0.0",
        actorId: "publisher-1",
        validationSummary: VALIDATION_OK,
      }),
    );

    expect(published.version.status).toBe("active");
    expect(published.version.version).toBe("1.0.0");
    expect(published.event.eventType).toBe("published");

    const evidence = await runRepo((repo) =>
      repo.getPublicationEvidence({ methodologyVersionId: created.version.id }),
    );
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.publishedVersion).toBe("1.0.0");
    expect(evidence[0]?.sourceDraftRef).toBe(`draft:${created.version.id}`);
    expect(evidence[0]?.actorId).toBe("publisher-1");
    expect(evidence[0]?.validationSummary.valid).toBe(true);
  });

  it("rejects duplicate published version without additional evidence writes", async () => {
    const first = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "0.1.0-draft-a",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const second = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "0.1.0-draft-b",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: first.version.id,
        publishedVersion: "1.0.0",
        actorId: "publisher-1",
        validationSummary: VALIDATION_OK,
      }),
    );

    await expect(
      runRepo((repo) =>
        repo.publishDraftVersion({
          versionId: second.version.id,
          publishedVersion: "1.0.0",
          actorId: "publisher-2",
          validationSummary: VALIDATION_OK,
        }),
      ),
    ).rejects.toThrow();

    const firstEvidence = await runRepo((repo) =>
      repo.getPublicationEvidence({ methodologyVersionId: first.version.id }),
    );
    const secondEvidence = await runRepo((repo) =>
      repo.getPublicationEvidence({ methodologyVersionId: second.version.id }),
    );

    expect(firstEvidence).toHaveLength(1);
    expect(secondEvidence).toHaveLength(0);
  });

  it("returns concurrent publish conflict for repeat publish on same draft version", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "0.1.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: created.version.id,
        publishedVersion: "1.0.0",
        actorId: "publisher-1",
        validationSummary: VALIDATION_OK,
      }),
    );

    const conflictError = await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: created.version.id,
        publishedVersion: "1.0.1",
        actorId: "publisher-2",
        validationSummary: VALIDATION_OK,
      }),
    ).catch((error) => error);

    expect(String(conflictError)).toContain("PUBLISH_CONCURRENT_WRITE_CONFLICT");
  });

  it("persists and reads artifact slots with nested templates for a work-unit type", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "artifact-slot-methodology",
        displayName: "Artifact Slot Methodology",
        version: "0.1.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const versionId = created.version.id;

    await db.insert(methodologyWorkUnitTypes).values({
      methodologyVersionId: versionId,
      key: "task",
      displayName: "Task",
      descriptionJson: null,
      cardinality: "many_per_project",
      guidanceJson: null,
    });

    await runRepo((repo) =>
      repo.replaceArtifactSlotsForWorkUnitType({
        versionId,
        workUnitTypeKey: "task",
        slots: [
          {
            id: "draft:slot-001",
            key: "project_brief",
            displayName: "Project Brief",
            descriptionJson: { human: { markdown: "Project brief" }, agent: { markdown: "" } },
            guidanceJson: { human: { markdown: "Keep concise" }, agent: { markdown: "" } },
            cardinality: "single",
            rulesJson: { maxFiles: 1 },
            templates: [
              {
                id: "draft:template-001",
                key: "default",
                displayName: "Default Brief",
                descriptionJson: {
                  human: { markdown: "Default template" },
                  agent: { markdown: "" },
                },
                guidanceJson: { human: { markdown: "Fill all sections" }, agent: { markdown: "" } },
                content: "# Brief\n\n- Context\n- Goals",
              },
            ],
          },
        ],
      }),
    );

    const slots = await runRepo((repo) =>
      repo.findArtifactSlotsByWorkUnitType({ versionId, workUnitTypeKey: "task" }),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0]?.key).toBe("project_brief");
    expect(slots[0]?.cardinality).toBe("single");
    expect(slots[0]?.templates).toHaveLength(1);
    expect(slots[0]?.templates[0]?.key).toBe("default");
    expect(slots[0]?.templates[0]?.content).toContain("# Brief");
    expect(slots[0]?.id).toBeDefined();
    expect(slots[0]?.templates[0]?.id).toBeDefined();
  });

  it("updates artifact slots by id when keys change", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "artifact-slot-key-rename-methodology",
        displayName: "Artifact Slot Key Rename Methodology",
        version: "0.1.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const versionId = created.version.id;

    await db.insert(methodologyWorkUnitTypes).values({
      methodologyVersionId: versionId,
      key: "task",
      displayName: "Task",
      descriptionJson: null,
      cardinality: "many_per_project",
      guidanceJson: null,
    });

    // Create initial slot with draft id
    await runRepo((repo) =>
      repo.replaceArtifactSlotsForWorkUnitType({
        versionId,
        workUnitTypeKey: "task",
        slots: [
          {
            id: "draft:slot-rename-001",
            key: "original_key",
            displayName: "Original Name",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "single",
            rulesJson: null,
            templates: [],
          },
        ],
      }),
    );

    // Get the persisted slot with real id
    const slotsBefore = await runRepo((repo) =>
      repo.findArtifactSlotsByWorkUnitType({ versionId, workUnitTypeKey: "task" }),
    );
    const persistedSlotId = slotsBefore[0]!.id;
    expect(persistedSlotId).toBeDefined();
    expect(persistedSlotId).not.toMatch(/^draft:/);

    // Update the slot using persisted id but with changed key
    await runRepo((repo) =>
      repo.replaceArtifactSlotsForWorkUnitType({
        versionId,
        workUnitTypeKey: "task",
        slots: [
          {
            id: persistedSlotId,
            key: "renamed_key",
            displayName: "Renamed Name",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "single",
            rulesJson: null,
            templates: [],
          },
        ],
      }),
    );

    // Verify the same slot id has the new key
    const slotsAfter = await runRepo((repo) =>
      repo.findArtifactSlotsByWorkUnitType({ versionId, workUnitTypeKey: "task" }),
    );
    expect(slotsAfter).toHaveLength(1);
    expect(slotsAfter[0]?.id).toBe(persistedSlotId);
    expect(slotsAfter[0]?.key).toBe("renamed_key");
    expect(slotsAfter[0]?.displayName).toBe("Renamed Name");
  });

  it("creates new slots when provided ids do not match persisted rows", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "artifact-slot-unknown-id-methodology",
        displayName: "Artifact Slot Unknown ID Methodology",
        version: "0.1.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    const versionId = created.version.id;

    await db.insert(methodologyWorkUnitTypes).values({
      methodologyVersionId: versionId,
      key: "task",
      displayName: "Task",
      descriptionJson: null,
      cardinality: "many_per_project",
      guidanceJson: null,
    });

    await runRepo((repo) =>
      repo.replaceArtifactSlotsForWorkUnitType({
        versionId,
        workUnitTypeKey: "task",
        slots: [
          {
            id: "non-existent-uuid-1234",
            key: "some_key",
            displayName: "Some Name",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "single",
            rulesJson: null,
            templates: [],
          },
        ],
      }),
    );

    const slots = await runRepo((repo) =>
      repo.findArtifactSlotsByWorkUnitType({ versionId, workUnitTypeKey: "task" }),
    );
    expect(slots).toHaveLength(1);
    expect(slots[0]?.key).toBe("some_key");
  });

  it("returns atomicity guard code and preserves draft state on event-write failure", async () => {
    const created = await runRepo((repo) =>
      repo.createDraft({
        methodologyKey: "foundation-methodology",
        displayName: "Foundation Methodology",
        version: "0.2.0-draft",
        definitionExtensions: {},
        workflows: [],
        transitionWorkflowBindings: {},
        actorId: "user-1",
        validationDiagnostics: VALIDATION_OK,
      }),
    );

    await client.execute("DROP TABLE methodology_version_events");

    const atomicityError = await runRepo((repo) =>
      repo.publishDraftVersion({
        versionId: created.version.id,
        publishedVersion: "1.0.0",
        actorId: "publisher-1",
        validationSummary: VALIDATION_OK,
      }),
    ).catch((error) => error);

    expect(String(atomicityError)).toContain("PUBLISH_ATOMICITY_GUARD_ABORTED");

    const versionRows = await db
      .select({ status: methodologyVersions.status })
      .from(methodologyVersions)
      .where(eq(methodologyVersions.id, created.version.id));
    expect(versionRows[0]?.status).toBe("draft");

    const rowCountResult = await client.execute(
      "SELECT COUNT(*) AS count FROM methodology_versions WHERE id = ? AND status = 'active'",
      [created.version.id],
    );
    expect(Number(rowCountResult.rows[0]?.count ?? 0)).toBe(0);
  });

  it("pins and repins project methodology with append-only lineage ordering", async () => {
    const v1 = await createAndPublishVersion("pin-lineage-methodology", "0.1.0-draft", "1.0.0");
    const v2 = await createAndPublishVersion("pin-lineage-methodology", "0.2.0-draft", "2.0.0");

    await runProjectRepo((repo) =>
      repo.pinProjectMethodologyVersion({
        projectId: "project-lineage",
        methodologyVersionId: v1.id,
        actorId: "operator-1",
        previousVersion: null,
        newVersion: "1.0.0",
      }),
    );

    await runProjectRepo((repo) =>
      repo.repinProjectMethodologyVersion({
        projectId: "project-lineage",
        methodologyVersionId: v2.id,
        actorId: "operator-2",
        previousVersion: "1.0.0",
        newVersion: "2.0.0",
      }),
    );

    const lineage = await runProjectRepo((repo) =>
      repo.getProjectPinLineage({ projectId: "project-lineage" }),
    );

    expect(lineage).toHaveLength(2);
    expect(lineage[0]?.eventType).toBe("pinned");
    expect(lineage[1]?.eventType).toBe("repinned");
    expect(lineage[1]?.previousVersion).toBe("1.0.0");
    expect(lineage[1]?.newVersion).toBe("2.0.0");
    expect(lineage[0]?.evidenceRef).toContain("project-pin-event:");
    expect(lineage[1]?.evidenceRef).toContain("project-pin-event:");
  });

  it("blocks repin when project does not have an existing pin", async () => {
    const v1 = await createAndPublishVersion(
      "pin-requires-existing-methodology",
      "0.1.0-draft",
      "1.0.0",
    );

    const error = await runProjectRepo((repo) =>
      repo.repinProjectMethodologyVersion({
        projectId: "project-no-pin",
        methodologyVersionId: v1.id,
        actorId: "operator-1",
        previousVersion: null,
        newVersion: "1.0.0",
      }),
    ).catch((caught) => caught);

    expect(String(error)).toContain("PROJECT_REPIN_REQUIRES_EXISTING_PIN");

    const pinRows = await db
      .select()
      .from(projectMethodologyPins)
      .where(eq(projectMethodologyPins.projectId, "project-no-pin"));
    expect(pinRows).toHaveLength(0);
  });

  it("blocks repin for projects with persisted executions without mutating pin pointer", async () => {
    const v1 = await createAndPublishVersion("pin-guard-methodology", "0.1.0-draft", "1.0.0");
    const v2 = await createAndPublishVersion("pin-guard-methodology", "0.2.0-draft", "2.0.0");

    await runProjectRepo((repo) =>
      repo.pinProjectMethodologyVersion({
        projectId: "project-exec-guard",
        methodologyVersionId: v1.id,
        actorId: "operator-1",
        previousVersion: null,
        newVersion: "1.0.0",
      }),
    );

    await db.insert(projectExecutions).values({
      projectId: "project-exec-guard",
      methodologyVersionId: v1.id,
    });

    const error = await runProjectRepo((repo) =>
      repo.repinProjectMethodologyVersion({
        projectId: "project-exec-guard",
        methodologyVersionId: v2.id,
        actorId: "operator-2",
        previousVersion: "1.0.0",
        newVersion: "2.0.0",
      }),
    ).catch((caught) => caught);

    expect(String(error)).toContain("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY");

    const pinRows = await db
      .select()
      .from(projectMethodologyPins)
      .where(eq(projectMethodologyPins.projectId, "project-exec-guard"));
    expect(pinRows).toHaveLength(1);
    expect(pinRows[0]?.publishedVersion).toBe("1.0.0");
  });

  it("aborts pin atomically when pin-event persistence fails", async () => {
    const v1 = await createAndPublishVersion("pin-atomicity-methodology", "0.1.0-draft", "1.0.0");

    await client.execute("DROP TABLE project_methodology_pin_events");

    const error = await runProjectRepo((repo) =>
      repo.pinProjectMethodologyVersion({
        projectId: "project-atomicity",
        methodologyVersionId: v1.id,
        actorId: "operator-1",
        previousVersion: null,
        newVersion: "1.0.0",
      }),
    ).catch((caught) => caught);

    expect(String(error)).toContain("PROJECT_PIN_ATOMICITY_GUARD_ABORTED");

    const pinRows = await db
      .select()
      .from(projectMethodologyPins)
      .where(eq(projectMethodologyPins.projectId, "project-atomicity"));
    expect(pinRows).toHaveLength(0);
  });
});
