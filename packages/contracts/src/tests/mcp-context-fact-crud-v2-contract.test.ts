import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  AGENT_STEP_MCP_V2_TOOLS,
  AgentStepMcpScopeV2,
  AgentStepMcpV2RequestEnvelope,
  AgentStepMcpV2ResponseEnvelope,
  CreateContextFactInstanceInputV2,
  DeleteContextFactInstanceInputV2,
  ReadAttachableTargetsInputV2,
  ReadContextFactInstancesInputV2,
  ReadContextFactInstancesOutputV2,
  ReadContextFactSchemaInputV2,
  ReadContextFactSchemaOutputV2,
  ReadStepExecutionSnapshotOutputV2,
  UpdateContextFactInstanceInputV2,
  WorkUnitDraftSpecAuthoredValue,
} from "../mcp/context-fact-crud-v2";

describe("mcp context fact CRUD v2 contracts", () => {
  it("locks the full v2 tool set including step snapshot", () => {
    expect(AGENT_STEP_MCP_V2_TOOLS).toEqual([
      "read_step_execution_snapshot",
      "read_context_fact_schema",
      "read_context_fact_instances",
      "read_attachable_targets",
      "create_context_fact_instance",
      "update_context_fact_instance",
      "remove_context_fact_instance",
      "delete_context_fact_instance",
    ]);

    const scope = Schema.decodeUnknownSync(AgentStepMcpScopeV2)({
      version: "v2",
      tools: [...AGENT_STEP_MCP_V2_TOOLS],
      requestContextAccess: false,
    });

    expect(scope.tools).toHaveLength(8);
  });

  it("locks the step snapshot overview shape", () => {
    const output = Schema.decodeUnknownSync(ReadStepExecutionSnapshotOutputV2)({
      state: "active_idle",
      objective: "Draft setup outputs",
      instructionsMarkdown: "Use only facts in scope.",
      completion: {
        total: 3,
        withInstances: 2,
        withoutInstances: 1,
        isComplete: false,
      },
      readSet: [
        {
          factKey: "project_context",
          contextFactKind: "plain_fact",
          label: "Project Context",
          access: {
            canReadSchema: true,
            canReadInstances: true,
            canReadAttachableTargets: false,
          },
        },
      ],
      writeSet: [
        {
          factKey: "story_draft",
          contextFactKind: "work_unit_draft_spec_fact",
          label: "Story Draft",
          instanceCount: 1,
          hasInstances: true,
          requiredForCompletion: true,
          readAccess: {
            canReadSchema: true,
            canReadInstances: true,
            canReadAttachableTargets: true,
          },
          writeAccess: {
            canCreate: true,
            canUpdate: true,
            canRemove: true,
            canDelete: false,
          },
        },
      ],
    });

    expect(output.completion.withoutInstances).toBe(1);
    expect(output.writeSet[0]?.factKey).toBe("story_draft");
  });

  it("locks schema reads for plain facts and draft specs", () => {
    expect(Schema.decodeUnknownSync(ReadContextFactSchemaInputV2)({ factKey: "summary" })).toEqual({
      factKey: "summary",
    });

    const plain = Schema.decodeUnknownSync(ReadContextFactSchemaOutputV2)({
      factKey: "summary",
      contextFactKind: "plain_fact",
      label: "Summary",
      cardinality: "one",
      actions: ["create", "update", "remove"],
      valueType: "string",
      validation: { kind: "none" },
    });

    expect(plain.contextFactKind).toBe("plain_fact");

    const draft = Schema.decodeUnknownSync(ReadContextFactSchemaOutputV2)({
      factKey: "story_draft",
      contextFactKind: "work_unit_draft_spec_fact",
      label: "Story Draft",
      cardinality: "many",
      actions: ["create", "update", "remove"],
      targetWorkUnitDefinitionId: "wu-story",
      selectedFactSchemas: {
        "fact-title": {
          factKey: "fact-title",
          label: "Title",
          valueType: "string",
          cardinality: "one",
          validation: { kind: "none" },
        },
      },
      selectedArtifactSchemas: {
        "slot-story-doc": {
          slotKey: "slot-story-doc",
          label: "Story Doc",
          rules: { repoRelativePathRegex: "stories/.*" },
        },
      },
    });

    expect(draft.contextFactKind).toBe("work_unit_draft_spec_fact");
  });

  it("locks current-instance reads across bound, artifact, and draft-spec facts", () => {
    expect(
      Schema.decodeUnknownSync(ReadContextFactInstancesInputV2)({
        factKey: "requires_research",
        instanceIds: ["ctx-1"],
        limit: 10,
      }),
    ).toEqual({ factKey: "requires_research", instanceIds: ["ctx-1"], limit: 10 });

    const output = Schema.decodeUnknownSync(ReadContextFactInstancesOutputV2)({
      factKey: "requires_research",
      contextFactKind: "bound_fact",
      instances: [
        {
          instanceId: "ctx-1",
          recordedAt: "2026-04-22T00:00:00.000Z",
          value: {
            factInstanceId: "fact-1",
            value: true,
          },
        },
        {
          instanceId: "ctx-2",
          value: {
            slotDefinitionId: "slot-1",
            artifactInstanceId: "artifact-1",
            files: [{ filePath: "docs/brief.md", gitCommitHash: "abc123" }],
          },
          artifactSlotKey: "project_overview",
        },
        {
          instanceId: "ctx-3",
          value: {
            factValues: { "fact-title": "Draft title" },
            artifactValues: { "slot-story-doc": ["stories/draft.md"] },
          },
        },
      ],
    });

    expect(output.instances).toHaveLength(3);
  });

  it("locks attachable target reads for work-unit references and draft-spec field options", () => {
    expect(
      Schema.decodeUnknownSync(ReadAttachableTargetsInputV2)({
        factKey: "story_draft",
        targetFieldKey: "parent_story",
        targetIds: ["wu-1"],
        limit: 5,
      }),
    ).toEqual({
      factKey: "story_draft",
      targetFieldKey: "parent_story",
      targetIds: ["wu-1"],
      limit: 5,
    });

    const response = Schema.decodeUnknownSync(AgentStepMcpV2ResponseEnvelope)({
      version: "v2",
      toolName: "read_attachable_targets",
      output: {
        factKey: "story_draft",
        contextFactKind: "work_unit_draft_spec_fact",
        fields: {
          parent_story: [
            {
              projectWorkUnitId: "wu-1",
              label: "Story 1",
              workUnitTypeKey: "story",
              workUnitTypeName: "Story",
              currentStateKey: "draft",
              factSummaries: [
                {
                  factKey: "title",
                  cardinality: "one",
                  hasValue: true,
                  currentCount: 1,
                  previewValue: "Draft story",
                },
              ],
            },
          ],
        },
      },
    });

    expect(response.toolName).toBe("read_attachable_targets");
  });

  it("locks create and update payload variations by fact kind", () => {
    expect(
      Schema.decodeUnknownSync(CreateContextFactInstanceInputV2)({
        factKey: "summary",
        value: "Approved summary",
      }),
    ).toEqual({ factKey: "summary", value: "Approved summary" });

    expect(
      Schema.decodeUnknownSync(CreateContextFactInstanceInputV2)({
        factKey: "requires_research",
        value: {
          factInstanceId: "fact-1",
          value: true,
        },
      }).value,
    ).toEqual({ factInstanceId: "fact-1", value: true });

    expect(
      Schema.decodeUnknownSync(CreateContextFactInstanceInputV2)({
        factKey: "story_draft",
        value: {
          factValues: { "fact-title": "Draft title" },
          artifactValues: { "slot-story-doc": ["stories/draft.md"] },
        },
      }).value,
    ).toEqual({
      factValues: { "fact-title": "Draft title" },
      artifactValues: { "slot-story-doc": ["stories/draft.md"] },
    });

    expect(
      Schema.decodeUnknownSync(UpdateContextFactInstanceInputV2)({
        factKey: "project_overview_artifact",
        instanceId: "ctx-1",
        value: {
          files: [{ filePath: "docs/brief.md", gitCommitHash: "abc123" }],
          slotDefinitionId: "slot-1",
          artifactInstanceId: "artifact-1",
        },
      }).instanceId,
    ).toBe("ctx-1");
  });

  it("locks remove and delete payload specializations", () => {
    expect(
      Schema.decodeUnknownSync(AgentStepMcpV2RequestEnvelope)({
        version: "v2",
        toolName: "remove_context_fact_instance",
        input: {
          factKey: "summary",
          instanceId: "ctx-1",
        },
      }),
    ).toMatchObject({ toolName: "remove_context_fact_instance" });

    expect(
      Schema.decodeUnknownSync(DeleteContextFactInstanceInputV2)({
        factKey: "project_overview_artifact",
        instanceId: "ctx-1",
        filePath: "docs/brief.md",
        deleted: true,
      }),
    ).toEqual({
      factKey: "project_overview_artifact",
      instanceId: "ctx-1",
      filePath: "docs/brief.md",
      deleted: true,
    });
  });

  it("locks write responses to a single applied result envelope", () => {
    const response = Schema.decodeUnknownSync(AgentStepMcpV2ResponseEnvelope)({
      version: "v2",
      toolName: "update_context_fact_instance",
      output: {
        status: "applied",
        operation: "update",
        factKey: "requires_research",
        instanceId: "ctx-1",
        value: {
          factInstanceId: "fact-2",
          value: false,
        },
        changedContext: true,
      },
    });

    expect(response.toolName).toBe("update_context_fact_instance");
  });

  it("locks keyed draft-spec authored values as a first-class MCP shape", () => {
    expect(
      Schema.decodeUnknownSync(WorkUnitDraftSpecAuthoredValue)({
        factValues: {
          "fact-title": "Draft title",
          "fact-body": "Draft body",
        },
        artifactValues: {
          "slot-story-doc": ["stories/draft.md"],
        },
      }),
    ).toEqual({
      factValues: {
        "fact-title": "Draft title",
        "fact-body": "Draft body",
      },
      artifactValues: {
        "slot-story-doc": ["stories/draft.md"],
      },
    });
  });
});
