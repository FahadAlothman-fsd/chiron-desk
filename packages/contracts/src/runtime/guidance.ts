import * as Schema from "effect/Schema";

import { RuntimeCandidateAvailability } from "./status.js";

export const RUNTIME_GUIDANCE_STREAM_ENVELOPE_VERSIONS = ["1"] as const;
export const RuntimeGuidanceStreamEnvelopeVersion = Schema.Literal(
  ...RUNTIME_GUIDANCE_STREAM_ENVELOPE_VERSIONS,
);
export type RuntimeGuidanceStreamEnvelopeVersion = typeof RuntimeGuidanceStreamEnvelopeVersion.Type;

export const RUNTIME_GUIDANCE_STREAM_EVENT_TYPES = [
  "bootstrap",
  "transitionResult",
  "workUnitDone",
  "done",
  "error",
] as const;
export const RuntimeGuidanceStreamEventType = Schema.Literal(
  ...RUNTIME_GUIDANCE_STREAM_EVENT_TYPES,
);
export type RuntimeGuidanceStreamEventType = typeof RuntimeGuidanceStreamEventType.Type;

export const RuntimeCandidateSource = Schema.Literal("open", "future");
export type RuntimeCandidateSource = typeof RuntimeCandidateSource.Type;

export const RuntimeGuidanceWorkUnitContext = Schema.Struct({
  projectWorkUnitId: Schema.optional(Schema.String),
  workUnitTypeId: Schema.String,
  workUnitTypeKey: Schema.String,
  workUnitTypeName: Schema.String,
  currentStateKey: Schema.optional(Schema.String),
  currentStateLabel: Schema.String,
});
export type RuntimeGuidanceWorkUnitContext = typeof RuntimeGuidanceWorkUnitContext.Type;

export const RuntimeGuidanceCandidateTransition = Schema.Struct({
  candidateId: Schema.String,
  transitionId: Schema.String,
  transitionKey: Schema.String,
  transitionName: Schema.String,
  toStateKey: Schema.String,
  toStateLabel: Schema.String,
  source: RuntimeCandidateSource,
});
export type RuntimeGuidanceCandidateTransition = typeof RuntimeGuidanceCandidateTransition.Type;

export const RuntimeGuidanceCandidateCard = Schema.Struct({
  candidateCardId: Schema.String,
  source: RuntimeCandidateSource,
  workUnitContext: RuntimeGuidanceWorkUnitContext,
  summaries: Schema.Struct({
    facts: Schema.Struct({ currentCount: Schema.Number, totalCount: Schema.Number }),
    artifactSlots: Schema.Struct({ currentCount: Schema.Number, totalCount: Schema.Number }),
  }),
  transitions: Schema.Array(RuntimeGuidanceCandidateTransition),
});
export type RuntimeGuidanceCandidateCard = typeof RuntimeGuidanceCandidateCard.Type;

export const GetRuntimeGuidanceActiveInput = Schema.Struct({
  projectId: Schema.String,
});
export type GetRuntimeGuidanceActiveInput = typeof GetRuntimeGuidanceActiveInput.Type;

export const GetRuntimeGuidanceActiveOutput = Schema.Struct({
  activeWorkUnitCards: Schema.Array(
    Schema.Struct({
      projectWorkUnitId: Schema.String,
      workUnitTypeId: Schema.String,
      workUnitTypeKey: Schema.String,
      workUnitTypeName: Schema.String,
      currentStateKey: Schema.String,
      currentStateLabel: Schema.String,
      factSummary: Schema.Struct({
        currentCount: Schema.Number,
        totalCount: Schema.Number,
        changedCount: Schema.optional(Schema.Number),
      }),
      artifactSummary: Schema.Struct({
        currentCount: Schema.Number,
        totalCount: Schema.Number,
        changedCount: Schema.optional(Schema.Number),
      }),
      activeTransition: Schema.Struct({
        transitionExecutionId: Schema.String,
        transitionId: Schema.String,
        transitionKey: Schema.String,
        transitionName: Schema.String,
        toStateKey: Schema.String,
        toStateLabel: Schema.String,
        status: Schema.Literal("active"),
        readyForCompletion: Schema.optional(Schema.Boolean),
      }),
      activePrimaryWorkflow: Schema.Struct({
        workflowExecutionId: Schema.String,
        workflowId: Schema.String,
        workflowKey: Schema.String,
        workflowName: Schema.String,
        status: Schema.Literal("active", "completed", "superseded"),
      }),
      actions: Schema.Struct({
        primary: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("open_workflow"),
            workflowExecutionId: Schema.String,
          }),
          Schema.Struct({
            kind: Schema.Literal("open_transition"),
            transitionExecutionId: Schema.String,
          }),
        ),
        openTransitionTarget: Schema.Struct({ transitionExecutionId: Schema.String }),
        openWorkflowTarget: Schema.Struct({ workflowExecutionId: Schema.String }),
      }),
    }),
  ),
});
export type GetRuntimeGuidanceActiveOutput = typeof GetRuntimeGuidanceActiveOutput.Type;

export const StreamRuntimeGuidanceCandidatesInput = Schema.Struct({
  projectId: Schema.String,
  filters: Schema.optional(
    Schema.Struct({
      workUnitTypeKeys: Schema.optional(Schema.Array(Schema.String)),
      transitionKeys: Schema.optional(Schema.Array(Schema.String)),
      fromStateKeys: Schema.optional(Schema.Array(Schema.String)),
      toStateKeys: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
});
export type StreamRuntimeGuidanceCandidatesInput = typeof StreamRuntimeGuidanceCandidatesInput.Type;

export const RuntimeGuidanceBootstrapEventEnvelope = Schema.Struct({
  version: RuntimeGuidanceStreamEnvelopeVersion,
  type: Schema.Literal("bootstrap"),
  cards: Schema.Array(RuntimeGuidanceCandidateCard),
});
export type RuntimeGuidanceBootstrapEventEnvelope =
  typeof RuntimeGuidanceBootstrapEventEnvelope.Type;

export const RuntimeGuidanceTransitionResultEventEnvelope = Schema.Struct({
  version: RuntimeGuidanceStreamEnvelopeVersion,
  type: Schema.Literal("transitionResult"),
  candidateId: Schema.String,
  result: RuntimeCandidateAvailability,
  firstReason: Schema.optional(Schema.String),
});
export type RuntimeGuidanceTransitionResultEventEnvelope =
  typeof RuntimeGuidanceTransitionResultEventEnvelope.Type;

export const RuntimeGuidanceWorkUnitDoneEventEnvelope = Schema.Struct({
  version: RuntimeGuidanceStreamEnvelopeVersion,
  type: Schema.Literal("workUnitDone"),
  candidateCardId: Schema.String,
});
export type RuntimeGuidanceWorkUnitDoneEventEnvelope =
  typeof RuntimeGuidanceWorkUnitDoneEventEnvelope.Type;

export const RuntimeGuidanceDoneEventEnvelope = Schema.Struct({
  version: RuntimeGuidanceStreamEnvelopeVersion,
  type: Schema.Literal("done"),
});
export type RuntimeGuidanceDoneEventEnvelope = typeof RuntimeGuidanceDoneEventEnvelope.Type;

export const RuntimeGuidanceErrorEventEnvelope = Schema.Struct({
  version: RuntimeGuidanceStreamEnvelopeVersion,
  type: Schema.Literal("error"),
  message: Schema.String,
});
export type RuntimeGuidanceErrorEventEnvelope = typeof RuntimeGuidanceErrorEventEnvelope.Type;

export const RuntimeGuidanceStreamEnvelope = Schema.Union(
  RuntimeGuidanceBootstrapEventEnvelope,
  RuntimeGuidanceTransitionResultEventEnvelope,
  RuntimeGuidanceWorkUnitDoneEventEnvelope,
  RuntimeGuidanceDoneEventEnvelope,
  RuntimeGuidanceErrorEventEnvelope,
);
export type RuntimeGuidanceStreamEnvelope = typeof RuntimeGuidanceStreamEnvelope.Type;
