import * as Schema from "effect/Schema";

import { RuntimeFactCardinality, RuntimeFactPrimitiveType } from "./work-units.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";

export const RUNTIME_FACT_CRUD_VERBS = ["create", "update", "remove", "delete"] as const;
export const RuntimeFactCrudVerb = Schema.Literal(...RUNTIME_FACT_CRUD_VERBS);
export type RuntimeFactCrudVerb = typeof RuntimeFactCrudVerb.Type;

export const RuntimeFactInstanceValue = Schema.Struct({
  instanceId: Schema.NonEmptyString,
  value: Schema.Unknown,
});
export type RuntimeFactInstanceValue = typeof RuntimeFactInstanceValue.Type;

export const WorkflowRefFactValue = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
});
export type WorkflowRefFactValue = typeof WorkflowRefFactValue.Type;

export const ArtifactTrackedFile = Schema.Struct({
  filePath: Schema.NonEmptyString,
  gitCommitHash: Schema.NullOr(Schema.NonEmptyString),
  gitCommitTitle: Schema.NullOr(Schema.String),
});
export type ArtifactTrackedFile = typeof ArtifactTrackedFile.Type;

export const ArtifactSlotReferenceFactValue = Schema.Struct({
  slotDefinitionId: Schema.NonEmptyString,
  artifactInstanceId: Schema.NonEmptyString,
  files: Schema.Array(ArtifactTrackedFile),
});
export type ArtifactSlotReferenceFactValue = typeof ArtifactSlotReferenceFactValue.Type;

export const WorkUnitDraftSpecFactValue = Schema.Struct({
  workUnitDefinitionId: Schema.NonEmptyString,
  factValues: Schema.Array(
    Schema.Struct({
      workUnitFactDefinitionId: Schema.NonEmptyString,
      value: Schema.Unknown,
    }),
  ),
  artifactValues: Schema.Array(
    Schema.Struct({
      slotDefinitionId: Schema.NonEmptyString,
      relativePath: Schema.optional(Schema.NonEmptyString),
      sourceContextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
      clear: Schema.optionalWith(Schema.Boolean, { default: () => false }),
    }),
  ),
});
export type WorkUnitDraftSpecFactValue = typeof WorkUnitDraftSpecFactValue.Type;

export const RuntimeFactManualCrudPayload = Schema.Union(
  Schema.Struct({
    verb: Schema.Literal("create"),
    value: Schema.Unknown,
  }),
  Schema.Struct({
    verb: Schema.Literal("update"),
    instanceId: Schema.NonEmptyString,
    value: Schema.Unknown,
  }),
  Schema.Struct({
    verb: Schema.Literal("remove"),
    instanceId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    verb: Schema.Literal("delete"),
  }),
);
export type RuntimeFactManualCrudPayload = typeof RuntimeFactManualCrudPayload.Type;

export class RuntimeFactValidationError extends Schema.TaggedError<RuntimeFactValidationError>()(
  "RuntimeFactValidationError",
  {
    factKind: WorkflowContextFactKind,
    message: Schema.String,
  },
) {}

export class RuntimeFactCrudError extends Schema.TaggedError<RuntimeFactCrudError>()(
  "RuntimeFactCrudError",
  {
    verb: RuntimeFactCrudVerb,
    message: Schema.String,
  },
) {}

export const RuntimeFactErrorEnvelope = Schema.Struct({
  status: Schema.Literal("error"),
  error: Schema.Union(RuntimeFactValidationError, RuntimeFactCrudError),
});
export type RuntimeFactErrorEnvelope = typeof RuntimeFactErrorEnvelope.Type;

export const GetProjectFactsInput = Schema.Struct({
  projectId: Schema.String,
  filters: Schema.optional(
    Schema.Struct({
      existence: Schema.optional(Schema.Literal("exists", "not_exists")),
      factTypes: Schema.optional(Schema.Array(RuntimeFactPrimitiveType)),
    }),
  ),
});
export type GetProjectFactsInput = typeof GetProjectFactsInput.Type;

export const GetProjectFactsOutput = Schema.Struct({
  project: Schema.Struct({ projectId: Schema.String, name: Schema.String }),
  filters: Schema.Struct({
    existence: Schema.optional(Schema.Literal("exists", "not_exists")),
    factTypes: Schema.optional(Schema.Array(RuntimeFactPrimitiveType)),
  }),
  cards: Schema.Array(
    Schema.Struct({
      factDefinitionId: Schema.String,
      factKey: Schema.String,
      factName: Schema.optional(Schema.String),
      factType: RuntimeFactPrimitiveType,
      cardinality: RuntimeFactCardinality,
      validation: Schema.optional(Schema.Unknown),
      exists: Schema.Boolean,
      currentCount: Schema.Number,
      currentValues: Schema.Array(RuntimeFactInstanceValue),
      target: Schema.Struct({
        page: Schema.Literal("project-fact-detail"),
        factDefinitionId: Schema.String,
      }),
      actions: Schema.optional(
        Schema.Struct({
          addInstance: Schema.optional(
            Schema.Struct({
              kind: Schema.Literal("add_project_fact_instance"),
              factDefinitionId: Schema.String,
            }),
          ),
        }),
      ),
    }),
  ),
});
export type GetProjectFactsOutput = typeof GetProjectFactsOutput.Type;

export const GetProjectFactDetailInput = Schema.Struct({
  projectId: Schema.String,
  factDefinitionId: Schema.String,
});
export type GetProjectFactDetailInput = typeof GetProjectFactDetailInput.Type;

export const RuntimeProjectFactDetailDefinition = Schema.Struct({
  factDefinitionId: Schema.String,
  factKey: Schema.String,
  factName: Schema.optional(Schema.String),
  factType: RuntimeFactPrimitiveType,
  cardinality: RuntimeFactCardinality,
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  validation: Schema.optional(Schema.Unknown),
});
export type RuntimeProjectFactDetailDefinition = typeof RuntimeProjectFactDetailDefinition.Type;

export const GetProjectFactDetailOutput = Schema.Struct({
  project: Schema.Struct({ projectId: Schema.String, name: Schema.String }),
  factDefinition: RuntimeProjectFactDetailDefinition,
  currentState: Schema.Struct({
    exists: Schema.Boolean,
    currentCount: Schema.Number,
    values: Schema.Array(
      RuntimeFactInstanceValue.pipe(
        Schema.extend(
          Schema.Struct({
            createdAt: Schema.String,
          }),
        ),
      ),
    ),
  }),
  actions: Schema.Struct({
    canAddInstance: Schema.Boolean,
    canUpdateExisting: Schema.Boolean,
    canRemoveExisting: Schema.Literal(false),
  }),
});
export type GetProjectFactDetailOutput = typeof GetProjectFactDetailOutput.Type;
