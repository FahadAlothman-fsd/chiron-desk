import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { describe, expect, it, vi } from "vitest";
import { Context, Effect, Layer } from "effect";

import { ValidationDecodeError } from "../../errors";
import { MethodologyRepository } from "../../repository";
import {
  WorkflowContextFactDefinitionService,
  WorkflowContextFactDefinitionServiceLive,
} from "../../services/workflow-context-fact-definition-service";

const draftVersion = {
  id: "ver-1",
  methodologyId: "meth-1",
  version: "v1",
  status: "draft",
  displayName: "Draft",
  definitionExtensions: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  retiredAt: null,
} as const;

const baseGuidance = {
  human: { markdown: "" },
  agent: { markdown: "" },
} as const;

const existingContextFact: WorkflowContextFactDto = {
  contextFactDefinitionId: "ctx-existing",
  kind: "plain_fact",
  key: "duplicate-key",
  cardinality: "one",
  type: "string",
  guidance: baseGuidance,
};

function makeProgram<T>(
  repoOverrides: Partial<Context.Tag.Service<typeof MethodologyRepository>>,
  run: (
    service: Context.Tag.Service<typeof WorkflowContextFactDefinitionService>,
  ) => Effect.Effect<T>,
) {
  const repo = {
    findVersionById: () => Effect.succeed(draftVersion),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([existingContextFact]),
    createWorkflowContextFactByDefinitionId: vi.fn(() => Effect.succeed(existingContextFact)),
    updateWorkflowContextFactByDefinitionId: vi.fn(() => Effect.succeed(existingContextFact)),
    recordEvent: () => Effect.void,
    ...repoOverrides,
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;

  const layer = Layer.provide(
    WorkflowContextFactDefinitionServiceLive,
    Layer.succeed(MethodologyRepository, repo),
  );

  const effect = Effect.gen(function* () {
    const service = yield* WorkflowContextFactDefinitionService;
    return yield* run(service);
  }).pipe(Effect.provide(layer));

  return { repo, effect };
}

describe("workflow context fact definition service", () => {
  it("fails create with ValidationDecodeError when key already exists", async () => {
    const { repo, effect } = makeProgram({}, (service) =>
      service.create(
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          fact: {
            kind: "work_unit_draft_spec_fact",
            key: "duplicate-key",
            cardinality: "one",
            guidance: baseGuidance,
            workUnitDefinitionId: "wut-story",
            selectedWorkUnitFactDefinitionIds: ["fact-title"],
            selectedArtifactSlotDefinitionIds: [],
          },
        },
        "user-1",
      ),
    );

    const error = await Effect.runPromise(Effect.flip(effect));
    expect(error).toBeInstanceOf(ValidationDecodeError);
    expect(error).toMatchObject({
      message: "Workflow context fact key 'duplicate-key' already exists",
    });

    expect(
      (repo.createWorkflowContextFactByDefinitionId as unknown as ReturnType<typeof vi.fn>).mock
        .calls.length,
    ).toBe(0);
  });

  it("fails update with ValidationDecodeError when key collides with another context fact", async () => {
    const currentContextFact: WorkflowContextFactDto = {
      contextFactDefinitionId: "ctx-current",
      kind: "work_unit_draft_spec_fact",
      key: "story-draft",
      cardinality: "one",
      guidance: baseGuidance,
      workUnitDefinitionId: "wut-story",
      selectedWorkUnitFactDefinitionIds: ["fact-title"],
      selectedArtifactSlotDefinitionIds: [],
    };

    const { repo, effect } = makeProgram(
      {
        listWorkflowContextFactsByDefinitionId: () =>
          Effect.succeed([existingContextFact, currentContextFact]),
      },
      (service) =>
        service.update(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            contextFactDefinitionId: "ctx-current",
            fact: {
              ...currentContextFact,
              key: "duplicate-key",
            },
          },
          "user-1",
        ),
    );

    const error = await Effect.runPromise(Effect.flip(effect));
    expect(error).toBeInstanceOf(ValidationDecodeError);
    expect(error).toMatchObject({
      message: "Workflow context fact key 'duplicate-key' already exists",
    });

    expect(
      (repo.updateWorkflowContextFactByDefinitionId as unknown as ReturnType<typeof vi.fn>).mock
        .calls.length,
    ).toBe(0);
  });
});
