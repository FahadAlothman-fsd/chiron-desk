import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { MethodologyRepository } from "@chiron/methodology-engine";
import {
  SandboxGitService,
  type SandboxGitArtifactComparison,
  type SandboxGitFileResolution,
} from "@chiron/sandbox-engine";
import { Context, Effect, Layer } from "effect";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ArtifactSlotReferencePathValidationError,
  ArtifactSlotReferenceService,
  ArtifactSlotReferenceServiceLive,
} from "../../index";

type ContextFactRow = {
  contextFactDefinitionId: string;
  instanceOrder: number;
  valueJson: unknown;
};

const makeSandboxGitLayer = (resolutions: Record<string, SandboxGitFileResolution>) =>
  Layer.succeed(SandboxGitService, {
    getAvailability: () => Effect.die("unused"),
    normalizeRepoRelativePath: (_rootPath: string, filePath: string) => {
      const candidate = filePath.replaceAll("\\", "/");
      const normalized = path.posix.normalize(candidate);
      if (
        path.posix.isAbsolute(normalized) ||
        normalized === "." ||
        normalized === ".." ||
        normalized.startsWith("../")
      ) {
        return Effect.fail(new Error("Path must stay within the repository root."));
      }

      return Effect.succeed(normalized);
    },
    resolveArtifactReference: ({ filePath }: { rootPath: string; filePath: string }) =>
      Effect.succeed(
        resolutions[filePath] ?? {
          status: "committed",
          relativePath: filePath,
          gitCommitHash: `commit:${filePath}`,
          gitBlobHash: `blob:${filePath}`,
          gitCommitSubject: `subject:${filePath}`,
          gitCommitBody: `body:${filePath}`,
        },
      ),
    compareRecordedArtifactReference: ({ recorded, current }) =>
      Effect.succeed<SandboxGitArtifactComparison>(
        current.status === "missing" ||
          (current.status === "not_committed" && current.deleted === true)
          ? {
              status: "deleted",
              relativePath: recorded.relativePath,
              gitCommitHash: recorded.gitCommitHash ?? null,
              gitBlobHash: recorded.gitBlobHash ?? null,
              gitCommitSubject: recorded.gitCommitSubject ?? null,
              gitCommitBody: recorded.gitCommitBody ?? null,
            }
          : {
              status: "unchanged",
              relativePath: recorded.relativePath,
            },
      ),
  } as unknown as Context.Tag.Service<typeof SandboxGitService>);

const makeMethodologyLayer = () =>
  Layer.succeed(MethodologyRepository, {
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-project-docs",
          key: "project-docs",
          workUnitTypeId: "wu-story",
          displayName: "Project docs",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset" as const,
          rulesJson: {
            pathPattern: "project/docs/.+\\.md",
            folderPathContextFactDefinitionId: "ctx-project-folder",
          },
          templates: [],
        },
        {
          id: "slot-workunit-docs",
          key: "workunit-docs",
          workUnitTypeId: "wu-story",
          displayName: "Work-unit docs",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset" as const,
          rulesJson: {
            pathPattern: "stories/.+\\.md",
            folderPathContextFactDefinitionId: "ctx-workunit-folder",
          },
          templates: [],
        },
        {
          id: "slot-root-docs",
          key: "root-docs",
          workUnitTypeId: "wu-story",
          displayName: "Root docs",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "fileset" as const,
          rulesJson: {
            pathPattern: "docs/.+\\.md",
            folderPathContextFactDefinitionId: "ctx-missing-folder",
          },
          templates: [],
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

const workflowContextFacts: WorkflowContextFactDto[] = [
  {
    kind: "bound_fact",
    key: "projectFolder",
    contextFactDefinitionId: "ctx-project-folder",
    cardinality: "one",
    factDefinitionId: "fact-project-folder",
    valueType: "string",
  },
  {
    kind: "bound_fact",
    key: "workUnitFolder",
    contextFactDefinitionId: "ctx-workunit-folder",
    cardinality: "one",
    factDefinitionId: "wu-fact-folder",
    valueType: "string",
  },
  {
    kind: "plain_value_fact",
    key: "missingFolder",
    contextFactDefinitionId: "ctx-missing-folder",
    cardinality: "one",
    valueType: "string",
  },
];

const makeServiceLayer = (resolutions: Record<string, SandboxGitFileResolution> = {}) =>
  ArtifactSlotReferenceServiceLive.pipe(
    Layer.provideMerge(makeMethodologyLayer()),
    Layer.provideMerge(makeSandboxGitLayer(resolutions)),
  );

const runNormalize = (params: {
  slotDefinitionId: string;
  rawCurrentValues: readonly ContextFactRow[];
  contextFacts?: readonly ContextFactRow[];
}) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* ArtifactSlotReferenceService;
      return yield* service.normalizeWriteValues({
        methodologyVersionId: "version-1",
        workUnitTypeKey: "story",
        contextFactDefinitionId: "ctx-artifact",
        slotDefinitionId: params.slotDefinitionId,
        projectRootPath: "/repo",
        workflowContextFacts,
        contextFacts: params.contextFacts ?? [],
        rawCurrentValues: params.rawCurrentValues,
      });
    }).pipe(Effect.provide(makeServiceLayer())),
  );

describe("artifact slot reference fact semantics", () => {
  it("groups files per slot and persists canonical slotDefinitionId for project-fact-linked folder bindings", async () => {
    const result = await runNormalize({
      slotDefinitionId: "slot-project-docs",
      contextFacts: [
        {
          contextFactDefinitionId: "ctx-project-folder",
          instanceOrder: 0,
          valueJson: { instanceId: "pf-1", value: "project/docs" },
        },
      ],
      rawCurrentValues: [
        {
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: {
            files: [{ path: "overview.md" }, { path: "details.md" }],
          },
        },
      ],
    });

    expect(result).toEqual([
      {
        contextFactDefinitionId: "ctx-artifact",
        instanceOrder: 0,
        valueJson: {
          slotDefinitionId: "slot-project-docs",
          files: [
            expect.objectContaining({ filePath: "project/docs/details.md", status: "present" }),
            expect.objectContaining({ filePath: "project/docs/overview.md", status: "present" }),
          ],
        },
      },
    ]);
  });

  it("supports work-unit-fact-linked folder bindings", async () => {
    const result = await runNormalize({
      slotDefinitionId: "slot-workunit-docs",
      contextFacts: [
        {
          contextFactDefinitionId: "ctx-workunit-folder",
          instanceOrder: 0,
          valueJson: { instanceId: "wuf-1", value: "stories" },
        },
      ],
      rawCurrentValues: [
        {
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: { files: [{ path: "story.md" }] },
        },
      ],
    });

    expect(result[0]?.valueJson.files).toEqual([
      expect.objectContaining({ filePath: "stories/story.md", status: "present" }),
    ]);
  });

  it("fails absolute, traversal, and wrong-regex repo-relative paths explicitly", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ArtifactSlotReferenceService;

      const absolute = yield* Effect.either(
        service.normalizeWriteValues({
          methodologyVersionId: "version-1",
          workUnitTypeKey: "story",
          contextFactDefinitionId: "ctx-artifact",
          slotDefinitionId: "slot-root-docs",
          projectRootPath: "/repo",
          workflowContextFacts,
          contextFacts: [],
          rawCurrentValues: [
            {
              contextFactDefinitionId: "ctx-artifact",
              instanceOrder: 0,
              valueJson: { files: [{ path: "/etc/passwd" }] },
            },
          ],
        }),
      );

      const traversal = yield* Effect.either(
        service.normalizeWriteValues({
          methodologyVersionId: "version-1",
          workUnitTypeKey: "story",
          contextFactDefinitionId: "ctx-artifact",
          slotDefinitionId: "slot-root-docs",
          projectRootPath: "/repo",
          workflowContextFacts,
          contextFacts: [],
          rawCurrentValues: [
            {
              contextFactDefinitionId: "ctx-artifact",
              instanceOrder: 0,
              valueJson: { files: [{ path: "../secret.md" }] },
            },
          ],
        }),
      );

      const wrongRegex = yield* Effect.either(
        service.normalizeWriteValues({
          methodologyVersionId: "version-1",
          workUnitTypeKey: "story",
          contextFactDefinitionId: "ctx-artifact",
          slotDefinitionId: "slot-root-docs",
          projectRootPath: "/repo",
          workflowContextFacts,
          contextFacts: [],
          rawCurrentValues: [
            {
              contextFactDefinitionId: "ctx-artifact",
              instanceOrder: 0,
              valueJson: { files: [{ path: "notes/todo.md" }] },
            },
          ],
        }),
      );

      return { absolute, traversal, wrongRegex };
    }).pipe(Effect.provide(makeServiceLayer()));

    const result = await Effect.runPromise(program);
    expect(result.absolute._tag).toBe("Left");
    expect(result.traversal._tag).toBe("Left");
    expect(result.wrongRegex._tag).toBe("Left");
    if (result.absolute._tag === "Left") {
      expect(result.absolute.left).toBeInstanceOf(ArtifactSlotReferencePathValidationError);
    }
    if (result.traversal._tag === "Left") {
      expect(result.traversal.left).toBeInstanceOf(ArtifactSlotReferencePathValidationError);
    }
    if (result.wrongRegex._tag === "Left") {
      expect(result.wrongRegex.left.message).toContain("does not match the slot path rules");
    }
  });

  it("folder binding fallback uses repo root when the folder fact is missing", async () => {
    const result = await runNormalize({
      slotDefinitionId: "slot-root-docs",
      rawCurrentValues: [
        {
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: { files: [{ path: "docs/fallback.md" }] },
        },
      ],
    });

    expect(result[0]?.valueJson.files).toEqual([
      expect.objectContaining({ filePath: "docs/fallback.md", status: "present" }),
    ]);
  });

  it("repo root fallback still enforces slot regex when the folder fact is missing", async () => {
    const program = Effect.gen(function* () {
      const service = yield* ArtifactSlotReferenceService;
      return yield* Effect.either(
        service.normalizeWriteValues({
          methodologyVersionId: "version-1",
          workUnitTypeKey: "story",
          contextFactDefinitionId: "ctx-artifact",
          slotDefinitionId: "slot-root-docs",
          projectRootPath: "/repo",
          workflowContextFacts,
          contextFacts: [],
          rawCurrentValues: [
            {
              contextFactDefinitionId: "ctx-artifact",
              instanceOrder: 0,
              valueJson: { files: [{ path: "fallback.md" }] },
            },
          ],
        }),
      );
    }).pipe(Effect.provide(makeServiceLayer()));

    const result = await Effect.runPromise(program);
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left.message).toContain("does not match the slot path rules");
    }
  });

  it("record_deleted_file keeps the file in the slot with deleted status", async () => {
    const layer = makeServiceLayer({
      "docs/existing.md": {
        status: "not_committed",
        relativePath: "docs/existing.md",
        tracked: true,
        untracked: false,
        staged: false,
        modified: false,
        deleted: true,
      },
    });

    const program = Effect.gen(function* () {
      const service = yield* ArtifactSlotReferenceService;
      return yield* service.normalizeWriteValues({
        methodologyVersionId: "version-1",
        workUnitTypeKey: "story",
        contextFactDefinitionId: "ctx-artifact",
        slotDefinitionId: "slot-root-docs",
        projectRootPath: "/repo",
        workflowContextFacts,
        contextFacts: [
          {
            contextFactDefinitionId: "ctx-artifact",
            instanceOrder: 0,
            valueJson: {
              slotDefinitionId: "slot-root-docs",
              files: [
                {
                  filePath: "docs/existing.md",
                  status: "present",
                  gitCommitHash: "commit-old",
                  gitBlobHash: "blob-old",
                  gitCommitSubject: "subject-old",
                  gitCommitBody: "body-old",
                },
                {
                  filePath: "docs/keep.md",
                  status: "present",
                  gitCommitHash: "commit-keep",
                  gitBlobHash: "blob-keep",
                  gitCommitSubject: "subject-keep",
                  gitCommitBody: "body-keep",
                },
              ],
            },
          },
        ],
        rawCurrentValues: [
          {
            contextFactDefinitionId: "ctx-artifact",
            instanceOrder: 0,
            valueJson: { files: [{ path: "docs/existing.md", operation: "record_deleted_file" }] },
          },
        ],
      });
    }).pipe(Effect.provide(layer));

    const result = await Effect.runPromise(program);
    expect(result[0]?.valueJson.files).toEqual([
      expect.objectContaining({ filePath: "docs/existing.md", status: "deleted" }),
      expect.objectContaining({ filePath: "docs/keep.md", status: "present" }),
    ]);
  });

  it("remove_from_slot removes the file from the slot without touching repo files", async () => {
    const result = await runNormalize({
      slotDefinitionId: "slot-root-docs",
      contextFacts: [
        {
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: {
            slotDefinitionId: "slot-root-docs",
            files: [
              { filePath: "docs/remove.md", status: "present" },
              { filePath: "docs/keep.md", status: "present" },
            ],
          },
        },
      ],
      rawCurrentValues: [
        {
          contextFactDefinitionId: "ctx-artifact",
          instanceOrder: 0,
          valueJson: { files: [{ path: "docs/remove.md", operation: "remove_from_slot" }] },
        },
      ],
    });

    expect(result[0]?.valueJson.files).toEqual([
      expect.objectContaining({ filePath: "docs/keep.md", status: "present" }),
    ]);
  });
});
