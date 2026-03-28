import * as Schema from "effect/Schema";

import { RuntimeFactCardinality, RuntimeFactPrimitiveType } from "./work-units.js";

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
      exists: Schema.Boolean,
      currentCount: Schema.Number,
      currentValues: Schema.Array(Schema.Unknown),
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
      Schema.Struct({
        projectFactInstanceId: Schema.String,
        value: Schema.Unknown,
        createdAt: Schema.String,
      }),
    ),
  }),
  actions: Schema.Struct({
    canAddInstance: Schema.Boolean,
    canUpdateExisting: Schema.Boolean,
    canRemoveExisting: Schema.Literal(false),
  }),
});
export type GetProjectFactDetailOutput = typeof GetProjectFactDetailOutput.Type;
