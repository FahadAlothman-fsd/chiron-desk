import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { ArtifactRepository } from "../../repositories/artifact-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import {
  WorkflowContextExternalPrefillService,
  WorkflowContextExternalPrefillServiceLive,
} from "../../services/workflow-context-external-prefill-service";

describe("WorkflowContextExternalPrefillService", () => {
  it("auto-attaches bound facts, artifact references, and work-unit references for singleton existing runtime values", async () => {
    let replaced: {
      affectedContextFactDefinitionIds: string[];
      currentValues: Array<{
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }>;
    } | null = null;

    const layer = Layer.provide(
      WorkflowContextExternalPrefillServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-exec-1",
                transitionExecutionId: "tx-1",
                workflowId: "wf-setup",
                workflowRole: "primary",
                status: "active",
                currentStepExecutionId: null,
                supersededByWorkflowExecutionId: null,
                startedAt: new Date(),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-story-1",
                transitionId: "tr-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-exec-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date(),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "project-1",
              projectWorkUnitId: "wu-story-1",
              workUnitTypeId: "wu-story",
              currentStateId: "draft",
            }),
          listWorkflowExecutionsForTransition: () => Effect.succeed([]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(StepExecutionRepository, {
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          replaceWorkflowExecutionContextFacts: (params: {
            affectedContextFactDefinitionIds: string[];
            currentValues: Array<{
              contextFactDefinitionId: string;
              instanceOrder: number;
              valueJson: unknown;
            }>;
          }) => {
            replaced = params;
            return Effect.void;
          },
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
        Layer.succeed(ProjectContextRepository, {
          findProjectPin: () =>
            Effect.succeed({
              projectId: "project-1",
              methodologyVersionId: "version-1",
              methodologyId: "methodology-1",
              methodologyKey: "core",
              publishedVersion: "1.0.0",
              actorId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
        } as unknown as Context.Tag.Service<typeof ProjectContextRepository>),
        Layer.succeed(LifecycleRepository, {
          findWorkUnitTypes: () =>
            Effect.succeed([
              {
                id: "wu-story",
                methodologyVersionId: "version-1",
                key: "WU.STORY",
                displayName: "Story",
                descriptionJson: null,
                guidanceJson: null,
                cardinality: "many_per_project",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "wu-setup",
                methodologyVersionId: "version-1",
                key: "WU.SETUP",
                displayName: "Setup",
                descriptionJson: null,
                guidanceJson: null,
                cardinality: "one",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          findFactSchemas: () =>
            Effect.succeed([
              {
                id: "fact-setup-link",
                methodologyVersionId: "version-1",
                workUnitTypeId: "wu-setup",
                name: "Setup link",
                key: "setup_link",
                factType: "work_unit",
                cardinality: "one",
                description: null,
                defaultValueJson: null,
                guidanceJson: null,
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
        } as unknown as Context.Tag.Service<typeof LifecycleRepository>),
        Layer.succeed(MethodologyRepository, {
          getWorkflowEditorDefinition: () =>
            Effect.succeed({
              contextFacts: [
                {
                  kind: "bound_fact",
                  key: "setup_link",
                  cardinality: "one",
                  contextFactDefinitionId: "ctx-bound",
                  factDefinitionId: "fact-setup-link",
                  workUnitDefinitionId: "wu-setup",
                },
                {
                  kind: "artifact_slot_reference_fact",
                  key: "brief_artifact",
                  cardinality: "one",
                  contextFactDefinitionId: "ctx-artifact",
                  slotDefinitionId: "slot-brief",
                },
                {
                  kind: "work_unit_reference_fact",
                  key: "setup_work_unit",
                  cardinality: "one",
                  contextFactDefinitionId: "ctx-work-unit",
                  targetWorkUnitDefinitionId: "wu-setup",
                },
              ],
            }),
          findFactDefinitionsByVersionId: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof MethodologyRepository>),
        Layer.succeed(ProjectFactRepository, {
          listFactsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ProjectFactRepository>),
        Layer.succeed(WorkUnitFactRepository, {
          listFactsByWorkUnit: ({ projectWorkUnitId }: { projectWorkUnitId: string }) =>
            Effect.succeed(
              projectWorkUnitId === "wu-setup-1"
                ? [
                    {
                      id: "fact-instance-1",
                      projectWorkUnitId,
                      factDefinitionId: "fact-setup-link",
                      valueJson: null,
                      referencedProjectWorkUnitId: "wu-setup-1",
                      status: "active",
                      supersededByFactInstanceId: null,
                      producedByTransitionExecutionId: null,
                      producedByWorkflowExecutionId: null,
                      authoredByUserId: null,
                      createdAt: new Date(),
                    },
                  ]
                : [],
            ),
        } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
        Layer.succeed(ArtifactRepository, {
          getCurrentSnapshotBySlot: () =>
            Effect.succeed({
              exists: true,
              snapshot: {
                id: "artifact-instance-1",
                projectWorkUnitId: "wu-story-1",
                slotDefinitionId: "slot-brief",
                recordedByTransitionExecutionId: null,
                recordedByWorkflowExecutionId: null,
                recordedByUserId: null,
                supersededByProjectArtifactSnapshotId: null,
                createdAt: new Date(),
              },
              members: [
                {
                  id: "artifact-file-1",
                  artifactSnapshotId: "artifact-instance-1",
                  filePath: "docs/brief.md",
                  memberStatus: "present",
                  gitCommitHash: "abc123",
                  gitBlobHash: null,
                  gitCommitTitle: "Add brief",
                  gitCommitBody: null,
                },
              ],
            }),
        } as unknown as Context.Tag.Service<typeof ArtifactRepository>),
        Layer.succeed(ProjectWorkUnitRepository, {
          listProjectWorkUnitsByProject: () =>
            Effect.succeed([
              {
                id: "wu-story-1",
                projectId: "project-1",
                workUnitTypeId: "wu-story",
                currentStateId: "draft",
                activeTransitionExecutionId: "tx-1",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "wu-setup-1",
                projectId: "project-1",
                workUnitTypeId: "wu-setup",
                currentStateId: "ready",
                activeTransitionExecutionId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowContextExternalPrefillService;
        return yield* service.prefillFromExternalBindings({
          projectId: "project-1",
          workflowExecutionId: "wf-exec-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.insertedCount).toBe(3);
    expect(replaced?.affectedContextFactDefinitionIds).toEqual([
      "ctx-bound",
      "ctx-work-unit",
      "ctx-artifact",
    ]);
    expect(replaced?.currentValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contextFactDefinitionId: "ctx-bound",
          valueJson: {
            factInstanceId: "fact-instance-1",
            value: { projectWorkUnitId: "wu-setup-1" },
          },
        }),
        expect.objectContaining({
          contextFactDefinitionId: "ctx-work-unit",
          valueJson: { projectWorkUnitId: "wu-setup-1" },
        }),
        expect.objectContaining({
          contextFactDefinitionId: "ctx-artifact",
          valueJson: {
            slotDefinitionId: "slot-brief",
            artifactInstanceId: "artifact-instance-1",
            files: [
              {
                filePath: "docs/brief.md",
                gitCommitHash: "abc123",
                gitCommitTitle: "Add brief",
              },
            ],
          },
        }),
      ]),
    );
  });

  it("prefills many-cardinality bound facts from array-valued project facts", async () => {
    let replaced: {
      affectedContextFactDefinitionIds: string[];
      currentValues: Array<{
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }>;
    } | null = null;

    const layer = Layer.provide(
      WorkflowContextExternalPrefillServiceLive,
      Layer.mergeAll(
        Layer.succeed(ExecutionReadRepository, {
          getTransitionExecutionDetail: () => Effect.succeed(null),
          listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
          getWorkflowExecutionDetail: () =>
            Effect.succeed({
              workflowExecution: {
                id: "wf-exec-1",
                transitionExecutionId: "tx-1",
                workflowId: "wf-setup",
                workflowRole: "primary",
                status: "active",
                currentStepExecutionId: null,
                supersededByWorkflowExecutionId: null,
                startedAt: new Date(),
                completedAt: null,
                supersededAt: null,
              },
              transitionExecution: {
                id: "tx-1",
                projectWorkUnitId: "wu-story-1",
                transitionId: "tr-1",
                status: "active",
                primaryWorkflowExecutionId: "wf-exec-1",
                supersededByTransitionExecutionId: null,
                startedAt: new Date(),
                completedAt: null,
                supersededAt: null,
              },
              projectId: "project-1",
              projectWorkUnitId: "wu-story-1",
              workUnitTypeId: "wu-story",
              currentStateId: "draft",
            }),
          listWorkflowExecutionsForTransition: () => Effect.succeed([]),
          listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>),
        Layer.succeed(StepExecutionRepository, {
          listWorkflowExecutionContextFacts: () => Effect.succeed([]),
          replaceWorkflowExecutionContextFacts: (params: {
            affectedContextFactDefinitionIds: string[];
            currentValues: Array<{
              contextFactDefinitionId: string;
              instanceOrder: number;
              valueJson: unknown;
            }>;
          }) => {
            replaced = params;
            return Effect.void;
          },
        } as unknown as Context.Tag.Service<typeof StepExecutionRepository>),
        Layer.succeed(ProjectContextRepository, {
          findProjectPin: () =>
            Effect.succeed({
              projectId: "project-1",
              methodologyVersionId: "version-1",
              methodologyId: "methodology-1",
              methodologyKey: "core",
              publishedVersion: "1.0.0",
              actorId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
        } as unknown as Context.Tag.Service<typeof ProjectContextRepository>),
        Layer.succeed(LifecycleRepository, {
          findWorkUnitTypes: () =>
            Effect.succeed([
              {
                id: "wu-story",
                methodologyVersionId: "version-1",
                key: "WU.STORY",
                displayName: "Story",
                descriptionJson: null,
                guidanceJson: null,
                cardinality: "many_per_project",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          findFactSchemas: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof LifecycleRepository>),
        Layer.succeed(MethodologyRepository, {
          getWorkflowEditorDefinition: () =>
            Effect.succeed({
              contextFacts: [
                {
                  kind: "bound_fact",
                  key: "objectives",
                  cardinality: "many",
                  contextFactDefinitionId: "ctx-objectives",
                  factDefinitionId: "project-objectives",
                },
              ],
            }),
          findFactDefinitionsByVersionId: () =>
            Effect.succeed([
              {
                id: "project-objectives",
                methodologyVersionId: "version-1",
                key: "objectives",
                name: "Objectives",
                cardinality: "many",
                valueType: "json",
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
        } as unknown as Context.Tag.Service<typeof MethodologyRepository>),
        Layer.succeed(ProjectFactRepository, {
          listFactsByProject: () =>
            Effect.succeed([
              {
                id: "project-fact-objectives-1",
                projectId: "project-1",
                factDefinitionId: "project-objectives",
                valueJson: [
                  { title: "Define the core promise and MVP boundary" },
                  { title: "Keep the scope intentionally narrow" },
                ],
                status: "active",
                supersededByFactInstanceId: null,
                createdAt: new Date(),
              },
            ]),
        } as unknown as Context.Tag.Service<typeof ProjectFactRepository>),
        Layer.succeed(WorkUnitFactRepository, {
          listFactsByWorkUnit: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof WorkUnitFactRepository>),
        Layer.succeed(ProjectWorkUnitRepository, {
          listProjectWorkUnitsByProject: () => Effect.succeed([]),
        } as unknown as Context.Tag.Service<typeof ProjectWorkUnitRepository>),
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowContextExternalPrefillService;
        return yield* service.prefillFromExternalBindings({
          projectId: "project-1",
          workflowExecutionId: "wf-exec-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.insertedCount).toBe(2);
    expect(replaced?.affectedContextFactDefinitionIds).toEqual([
      "ctx-objectives",
      "ctx-objectives",
    ]);
    expect(replaced?.currentValues).toEqual([
      {
        contextFactDefinitionId: "ctx-objectives",
        instanceOrder: 0,
        valueJson: {
          factInstanceId: "project-fact-objectives-1",
          value: { title: "Define the core promise and MVP boundary" },
        },
      },
      {
        contextFactDefinitionId: "ctx-objectives",
        instanceOrder: 1,
        valueJson: {
          factInstanceId: "project-fact-objectives-1",
          value: { title: "Keep the scope intentionally narrow" },
        },
      },
    ]);
  });
});
