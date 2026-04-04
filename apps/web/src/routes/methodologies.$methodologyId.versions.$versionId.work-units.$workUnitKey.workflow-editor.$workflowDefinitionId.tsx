import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";

import {
  type WorkflowContextFactDefinitionItem,
  type WorkflowEditorEdge,
  type WorkflowEditorMetadata,
  type WorkflowEditorStep,
} from "../features/workflow-editor/types";
import { WorkflowEditorShell } from "../features/workflow-editor/workflow-editor-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey/workflow-editor/$workflowDefinitionId",
)({
  component: MethodologyWorkflowEditorRoute,
});

type RawWorkflow = {
  workflowDefinitionId?: unknown;
  key?: unknown;
  displayName?: unknown;
  descriptionJson?: { markdown?: unknown } | null;
  description?: { markdown?: unknown } | string | null;
  metadata?: Record<string, unknown> | null;
  steps?: unknown[];
  edges?: unknown[];
};

function resolveWorkflowDefinitionId(workflow: RawWorkflow): string {
  if (
    typeof workflow.workflowDefinitionId === "string" &&
    workflow.workflowDefinitionId.length > 0
  ) {
    return workflow.workflowDefinitionId;
  }

  if (typeof workflow.metadata?.workflowDefinitionId === "string") {
    return workflow.metadata.workflowDefinitionId;
  }

  return "";
}

function toWorkflowMetadata(
  workflowDefinitionId: string,
  workflow: RawWorkflow,
): WorkflowEditorMetadata {
  const descriptionMarkdown =
    typeof workflow.descriptionJson?.markdown === "string"
      ? workflow.descriptionJson.markdown
      : typeof workflow.description === "object" && workflow.description !== null
        ? typeof workflow.description.markdown === "string"
          ? workflow.description.markdown
          : ""
        : typeof workflow.description === "string"
          ? workflow.description
          : "";

  return {
    workflowDefinitionId,
    key: typeof workflow.key === "string" ? workflow.key : workflowDefinitionId,
    displayName:
      typeof workflow.displayName === "string" && workflow.displayName.trim().length > 0
        ? workflow.displayName
        : typeof workflow.key === "string"
          ? workflow.key
          : workflowDefinitionId,
    descriptionMarkdown,
  };
}

function toWorkflowSteps(rawSteps: unknown[]): WorkflowEditorStep[] {
  return rawSteps
    .map((rawStep, index): WorkflowEditorStep | null => {
      if (!rawStep || typeof rawStep !== "object") {
        return null;
      }

      const step = rawStep as {
        stepId?: unknown;
        stepType?: unknown;
        payload?: unknown;
        key?: unknown;
        type?: unknown;
        displayName?: unknown;
      };

      if (step.stepType === "form" && step.payload && typeof step.payload === "object") {
        const payload = step.payload as {
          key?: unknown;
          label?: unknown;
          descriptionJson?: { markdown?: unknown };
          fields?: unknown;
          contextFacts?: unknown;
        };
        if (typeof payload.key !== "string") {
          return null;
        }

        return {
          stepId: typeof step.stepId === "string" ? step.stepId : `step-${index}`,
          stepType: "form",
          payload: {
            key: payload.key,
            ...(typeof payload.label === "string" ? { label: payload.label } : {}),
            ...(typeof payload.descriptionJson?.markdown === "string"
              ? { descriptionJson: { markdown: payload.descriptionJson.markdown } }
              : {}),
            fields: Array.isArray(payload.fields)
              ? (payload.fields as FormStepPayload["fields"])
              : [],
            contextFacts: Array.isArray(payload.contextFacts)
              ? (payload.contextFacts as FormStepPayload["contextFacts"])
              : [],
          },
        };
      }

      if (step.type !== "form" || typeof step.key !== "string") {
        return null;
      }

      return {
        stepId: typeof step.stepId === "string" ? step.stepId : `step-${index}`,
        stepType: "form",
        payload: {
          key: step.key,
          ...(typeof step.displayName === "string" ? { label: step.displayName } : {}),
          fields: [],
          contextFacts: [],
        },
      };
    })
    .filter((step): step is WorkflowEditorStep => step !== null);
}

function toWorkflowEdges(rawEdges: unknown[]): WorkflowEditorEdge[] {
  return rawEdges
    .map((rawEdge, index): WorkflowEditorEdge | null => {
      if (!rawEdge || typeof rawEdge !== "object") {
        return null;
      }

      const edge = rawEdge as {
        edgeId?: unknown;
        edgeKey?: unknown;
        fromStepKey?: unknown;
        toStepKey?: unknown;
        descriptionJson?: { markdown?: unknown };
      };

      if (typeof edge.fromStepKey !== "string" || typeof edge.toStepKey !== "string") {
        return null;
      }

      return {
        edgeId:
          typeof edge.edgeId === "string"
            ? edge.edgeId
            : typeof edge.edgeKey === "string"
              ? edge.edgeKey
              : `edge-${index}`,
        fromStepKey: edge.fromStepKey,
        toStepKey: edge.toStepKey,
        descriptionMarkdown:
          typeof edge.descriptionJson?.markdown === "string" ? edge.descriptionJson.markdown : "",
      };
    })
    .filter((edge): edge is WorkflowEditorEdge => edge !== null);
}

function toContextFactDefinitions(rawFacts: unknown): WorkflowContextFactDefinitionItem[] {
  if (!Array.isArray(rawFacts)) {
    return [];
  }

  return rawFacts
    .map((entry, index): WorkflowContextFactDefinitionItem | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const value = entry as {
        contextFactDefinitionId?: unknown;
        key?: unknown;
        kind?: unknown;
        valueType?: unknown;
        summary?: unknown;
      };

      if (typeof value.key !== "string" || typeof value.kind !== "string") {
        return null;
      }

      return {
        contextFactDefinitionId:
          typeof value.contextFactDefinitionId === "string"
            ? value.contextFactDefinitionId
            : `context-fact-${index}`,
        key: value.key,
        kind: value.kind,
        ...(typeof value.valueType === "string" ? { valueType: value.valueType } : {}),
        ...(typeof value.summary === "string" ? { summary: value.summary } : {}),
      };
    })
    .filter((item): item is WorkflowContextFactDefinitionItem => item !== null);
}

export function MethodologyWorkflowEditorRoute() {
  const { methodologyId, versionId, workUnitKey, workflowDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const workflowProcedures = orpc.methodology.version.workUnit.workflow as unknown as {
    list: {
      queryOptions: (args: { input: { versionId: string; workUnitTypeKey: string } }) => unknown;
    };
    update?: { mutationOptions: () => unknown };
    updateWorkflowMetadata?: { mutationOptions: () => unknown };
    createFormStep?: { mutationOptions: () => unknown };
    updateFormStep?: { mutationOptions: () => unknown };
    createEdge?: { mutationOptions: () => unknown };
    updateEdge?: { mutationOptions: () => unknown };
    deleteEdge?: { mutationOptions: () => unknown };
    contextFact?: {
      list?: {
        queryOptions: (args: {
          input: {
            versionId: string;
            workUnitTypeKey: string;
            workflowDefinitionId: string;
          };
        }) => unknown;
      };
    };
  };

  const workflowsQueryOptions = workflowProcedures.list.queryOptions({
    input: { versionId, workUnitTypeKey: workUnitKey },
  }) as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const workflowsQuery = useQuery(workflowsQueryOptions);

  const contextFactListQueryOptions = workflowProcedures.contextFact?.list?.queryOptions?.({
    input: {
      versionId,
      workUnitTypeKey: workUnitKey,
      workflowDefinitionId,
    },
  }) as
    | {
        queryKey: unknown[];
        queryFn: () => Promise<unknown>;
      }
    | undefined;

  const contextFactDefinitionsQuery = useQuery({
    ...(contextFactListQueryOptions ?? {
      queryKey: [
        "workflow-editor",
        "context-facts",
        methodologyId,
        versionId,
        workUnitKey,
        workflowDefinitionId,
      ],
      queryFn: async () => [],
    }),
  });

  const updateWorkflowMutation = useMutation(
    (workflowProcedures.updateWorkflowMetadata?.mutationOptions?.() ??
      workflowProcedures.update?.mutationOptions?.() ?? { mutationFn: async () => null }) as {
      mutationFn: (input: unknown) => Promise<unknown>;
    },
  );
  const createFormStepMutation = useMutation(
    (workflowProcedures.createFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateFormStepMutation = useMutation(
    (workflowProcedures.updateFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createEdgeMutation = useMutation(
    (workflowProcedures.createEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateEdgeMutation = useMutation(
    (workflowProcedures.updateEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteEdgeMutation = useMutation(
    (workflowProcedures.deleteEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );

  const workflows = Array.isArray(workflowsQuery.data)
    ? (workflowsQuery.data as RawWorkflow[])
    : [];
  const workflow = workflows.find((entry) => {
    const entryId = resolveWorkflowDefinitionId(entry);
    return entryId === workflowDefinitionId;
  });

  if (workflowsQuery.isLoading) {
    return (
      <section className="chiron-frame-flat chiron-tone-canvas grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm text-muted-foreground">Loading workflow editor definition...</p>
      </section>
    );
  }

  if (!workflow) {
    return (
      <section className="chiron-frame-flat chiron-tone-contracts grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm">
          Unable to resolve workflow {workflowDefinitionId} for work unit {workUnitKey}.
        </p>
      </section>
    );
  }

  const resolvedWorkflowDefinitionId = resolveWorkflowDefinitionId(workflow);

  return (
    <WorkflowEditorShell
      metadata={toWorkflowMetadata(resolvedWorkflowDefinitionId, workflow)}
      initialSteps={toWorkflowSteps(Array.isArray(workflow.steps) ? workflow.steps : [])}
      initialEdges={toWorkflowEdges(Array.isArray(workflow.edges) ? workflow.edges : [])}
      contextFactDefinitions={toContextFactDefinitions(contextFactDefinitionsQuery.data)}
      onSaveMetadata={async (metadata) => {
        await updateWorkflowMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowKey: workflow.key,
          workflow: {
            workflowDefinitionId: metadata.workflowDefinitionId,
            key: metadata.key,
            ...(metadata.displayName.length > 0 ? { displayName: metadata.displayName } : {}),
            ...(metadata.descriptionMarkdown.length > 0
              ? { descriptionJson: { markdown: metadata.descriptionMarkdown } }
              : {}),
          },
        });

        await queryClient.invalidateQueries({ queryKey: workflowsQueryOptions.queryKey });
      }}
      onCreateFormStep={async (payload) => {
        await createFormStepMutation.mutateAsync({
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          afterStepKey: null,
          payload,
        });
      }}
      onUpdateFormStep={async (stepId, payload) => {
        await updateFormStepMutation.mutateAsync({
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload,
        });
      }}
      onCreateEdge={async (edge) => {
        await createEdgeMutation.mutateAsync({
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          fromStepKey: edge.fromStepKey,
          toStepKey: edge.toStepKey,
          ...(edge.descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: edge.descriptionMarkdown } }
            : {}),
        });
      }}
      onUpdateEdge={async (edgeId, descriptionMarkdown) => {
        await updateEdgeMutation.mutateAsync({
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
          ...(descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: descriptionMarkdown } }
            : {}),
        });
      }}
      onDeleteEdge={async (edgeId) => {
        await deleteEdgeMutation.mutateAsync({
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
        });
      }}
    />
  );
}
