import type {
  GetRuntimeGuidanceActiveOutput,
  RuntimeGuidanceCandidateCard,
  RuntimeGuidanceStreamEnvelope,
} from "@chiron/contracts/runtime/guidance";
import type {
  GetTransitionStartGateDetailsInput,
  GetTransitionStartGateDetailsOutput,
} from "@chiron/contracts/runtime/work-units";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  RuntimeGuidanceSections,
  type RuntimeGuidanceTransitionResult,
} from "@/components/runtime/runtime-guidance-sections";
import { RuntimeStartGateDialog } from "@/components/runtime/runtime-start-gate-dialog";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { showSingletonAutoAttachWarnings } from "@/features/projects/singleton-auto-attach-warning-toast";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const transitionsSearchSchema = z.object({
  q: z.string().optional().default(""),
  status: z.enum(["all", "eligible", "blocked", "future"]).optional().default("all"),
  workUnitTypeKey: z.string().optional(),
});

export const Route = createFileRoute("/projects/$projectId/transitions")({
  validateSearch: (search) => transitionsSearchSchema.parse(search),
  component: ProjectTransitionsRoute,
});

type StartGateSelection = {
  readonly card: RuntimeGuidanceCandidateCard;
  readonly transition: RuntimeGuidanceCandidateCard["transitions"][number];
  readonly input: GetTransitionStartGateDetailsInput;
};

export type RuntimeGuidanceStreamState = {
  readonly candidateCards: readonly RuntimeGuidanceCandidateCard[];
  readonly transitionResults: Readonly<Record<string, RuntimeGuidanceTransitionResult>>;
  readonly completedCandidateCards: ReadonlySet<string>;
  readonly streamStatus: "idle" | "connecting" | "streaming" | "done" | "error";
  readonly streamErrorMessage: string | null;
};

export const initialRuntimeGuidanceStreamState: RuntimeGuidanceStreamState = {
  candidateCards: [],
  transitionResults: {},
  completedCandidateCards: new Set<string>(),
  streamStatus: "idle",
  streamErrorMessage: null,
};

export function applyRuntimeGuidanceStreamEvent(
  state: RuntimeGuidanceStreamState,
  event: RuntimeGuidanceStreamEnvelope,
): RuntimeGuidanceStreamState {
  if (event.type === "bootstrap") {
    return {
      ...state,
      candidateCards: event.cards,
      transitionResults: {},
      completedCandidateCards: new Set<string>(),
      streamStatus: "streaming",
      streamErrorMessage: null,
    };
  }

  if (event.type === "transitionResult") {
    return {
      ...state,
      transitionResults: {
        ...state.transitionResults,
        [event.candidateId]: {
          result: event.result,
          ...(event.firstReason ? { firstReason: event.firstReason } : {}),
        },
      },
    };
  }

  if (event.type === "workUnitDone") {
    const nextCompleted = new Set(state.completedCandidateCards);
    nextCompleted.add(event.candidateCardId);
    return {
      ...state,
      completedCandidateCards: nextCompleted,
    };
  }

  if (event.type === "done") {
    return {
      ...state,
      streamStatus: "done",
    };
  }

  return {
    ...state,
    streamStatus: "error",
    streamErrorMessage: event.message,
  };
}

export type RuntimeGuidanceLaunchDecision =
  | {
      readonly kind: "switch";
      readonly input: {
        projectId: string;
        projectWorkUnitId: string;
        supersededTransitionExecutionId: string;
        transitionId: string;
        transitionKey?: string;
        workflowId: string;
        workflowKey?: string;
      };
    }
  | {
      readonly kind: "start";
      readonly input: {
        projectId: string;
        transitionId: string;
        workflowId: string;
        workUnit:
          | {
              mode: "existing";
              projectWorkUnitId: string;
            }
          | {
              mode: "new";
              workUnitTypeId: string;
            };
      };
    };

export function resolveRuntimeGuidanceLaunchDecision(args: {
  projectId: string;
  selection: StartGateSelection;
  activeCards: GetRuntimeGuidanceActiveOutput["activeWorkUnitCards"];
  workflow: { workflowId: string; workflowKey?: string };
}): RuntimeGuidanceLaunchDecision {
  const { projectId, selection, activeCards, workflow } = args;
  const cardProjectWorkUnitId = selection.card.workUnitContext.projectWorkUnitId;

  const activeCardForWorkUnit = cardProjectWorkUnitId
    ? activeCards.find((card) => card.projectWorkUnitId === cardProjectWorkUnitId)
    : undefined;

  if (activeCardForWorkUnit && cardProjectWorkUnitId) {
    return {
      kind: "switch",
      input: {
        projectId,
        projectWorkUnitId: cardProjectWorkUnitId,
        supersededTransitionExecutionId:
          activeCardForWorkUnit.activeTransition.transitionExecutionId,
        transitionId: selection.transition.transitionId,
        transitionKey: selection.transition.transitionKey,
        workflowId: workflow.workflowId,
        ...(workflow.workflowKey ? { workflowKey: workflow.workflowKey } : {}),
      },
    };
  }

  return {
    kind: "start",
    input: {
      projectId,
      transitionId: selection.transition.transitionId,
      workflowId: workflow.workflowId,
      workUnit: cardProjectWorkUnitId
        ? {
            mode: "existing",
            projectWorkUnitId: cardProjectWorkUnitId,
          }
        : {
            mode: "new",
            workUnitTypeId:
              selection.input.futureCandidate?.workUnitTypeId ??
              selection.card.workUnitContext.workUnitTypeId,
          },
    },
  };
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

export function buildStartGateInput(
  projectId: string,
  card: RuntimeGuidanceCandidateCard,
  transition: RuntimeGuidanceCandidateCard["transitions"][number],
): GetTransitionStartGateDetailsInput {
  if (card.source === "future") {
    return {
      projectId,
      transitionId: transition.transitionId,
      transitionKey: transition.transitionKey,
      futureCandidate: {
        workUnitTypeId: card.workUnitContext.workUnitTypeId,
        workUnitTypeKey: card.workUnitContext.workUnitTypeKey,
        source: "future",
      },
    };
  }

  return {
    projectId,
    transitionId: transition.transitionId,
    transitionKey: transition.transitionKey,
    ...(card.workUnitContext.projectWorkUnitId
      ? { projectWorkUnitId: card.workUnitContext.projectWorkUnitId }
      : {}),
  };
}

export function ProjectTransitionsRoute() {
  const { projectId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();

  const activeGuidanceQueryOptions = useMemo(
    () =>
      orpc.project.getRuntimeGuidanceActive.queryOptions({
        input: { projectId },
      }),
    [orpc, projectId],
  );

  const runtimeActiveQueryKey = useMemo(
    () => ["runtime-guidance-active", projectId] as const,
    [projectId],
  );

  const activeGuidanceQuery = useQuery({
    ...activeGuidanceQueryOptions,
    queryKey: runtimeActiveQueryKey,
  });

  const activeCards =
    (activeGuidanceQuery.data as GetRuntimeGuidanceActiveOutput | undefined)?.activeWorkUnitCards ??
    [];

  const [streamEpoch, setStreamEpoch] = useState(0);
  const [candidateCards, setCandidateCards] = useState<readonly RuntimeGuidanceCandidateCard[]>([]);
  const [transitionResults, setTransitionResults] = useState<
    Record<string, RuntimeGuidanceTransitionResult>
  >({});
  const [completedCandidateCards, setCompletedCandidateCards] = useState<Set<string>>(new Set());
  const [streamStatus, setStreamStatus] = useState<
    "idle" | "connecting" | "streaming" | "done" | "error"
  >("idle");
  const [streamErrorMessage, setStreamErrorMessage] = useState<string | null>(null);
  const reconnectRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const currentEpoch = streamEpoch;

    const run = async () => {
      while (!cancelled) {
        reconnectRef.current = currentEpoch;
        reconnectRef.current += 1;
        setStreamStatus("connecting");

        let sawDone = false;

        try {
          const stream = (await orpc.project.streamRuntimeGuidanceCandidates.call({
            projectId,
          })) as AsyncIterable<RuntimeGuidanceStreamEnvelope>;

          setStreamStatus("streaming");

          for await (const event of stream) {
            if (cancelled) {
              break;
            }

            if (event.type === "bootstrap") {
              setCandidateCards(event.cards);
              setTransitionResults({});
              setCompletedCandidateCards(new Set());
              setStreamErrorMessage(null);
              continue;
            }

            if (event.type === "transitionResult") {
              setTransitionResults((previous) => ({
                ...previous,
                [event.candidateId]: {
                  result: event.result,
                  ...(event.firstReason ? { firstReason: event.firstReason } : {}),
                },
              }));
              continue;
            }

            if (event.type === "workUnitDone") {
              setCompletedCandidateCards((previous) => {
                const next = new Set(previous);
                next.add(event.candidateCardId);
                return next;
              });
              continue;
            }

            if (event.type === "done") {
              sawDone = true;
              setStreamStatus("done");
              break;
            }

            if (event.type === "error") {
              setStreamStatus("error");
              setStreamErrorMessage(event.message);
              throw new Error(event.message);
            }
          }

          if (cancelled) {
            break;
          }

          if (sawDone) {
            break;
          }
        } catch (error) {
          if (cancelled) {
            break;
          }

          setStreamStatus("error");
          setStreamErrorMessage(toErrorMessage(error));
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 250);
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [orpc, projectId, streamEpoch]);

  const [startGateSelection, setStartGateSelection] = useState<StartGateSelection | null>(null);

  const startGateQueryKey = useMemo(
    () =>
      startGateSelection
        ? ([
            "runtime-start-gate-detail",
            projectId,
            startGateSelection.input.transitionId,
            startGateSelection.input.projectWorkUnitId ?? "none",
            startGateSelection.input.futureCandidate?.workUnitTypeId ?? "none",
          ] as const)
        : (["runtime-start-gate-detail", projectId, "idle"] as const),
    [projectId, startGateSelection],
  );

  const startGateQuery = useQuery({
    queryKey: startGateQueryKey,
    enabled: startGateSelection !== null,
    queryFn: async () => {
      if (!startGateSelection) {
        return null;
      }

      return (await orpc.project.getRuntimeStartGateDetail.call(
        startGateSelection.input,
      )) as GetTransitionStartGateDetailsOutput;
    },
  });

  const refreshRuntimeGuidance = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: runtimeActiveQueryKey });
    setStreamEpoch((value) => value + 1);
  }, [queryClient, runtimeActiveQueryKey]);

  const startTransitionExecutionMutation = useMutation(
    orpc.project.startTransitionExecution.mutationOptions({
      onSuccess: async (result) => {
        showSingletonAutoAttachWarnings({
          warnings: result?.warnings,
          onOpenWorkUnits: () => {
            void navigate({
              to: "/projects/$projectId/work-units",
              params: { projectId },
              search: { q: "" },
            });
          },
        });
        await refreshRuntimeGuidance();
      },
      onError(error) {
        toast.error(toErrorMessage(error));
      },
    }),
  );

  const switchActiveTransitionExecutionMutation = useMutation(
    orpc.project.switchActiveTransitionExecution.mutationOptions({
      onSuccess: async (result) => {
        showSingletonAutoAttachWarnings({
          warnings: result?.warnings,
          onOpenWorkUnits: () => {
            void navigate({
              to: "/projects/$projectId/work-units",
              params: { projectId },
              search: { q: "" },
            });
          },
        });
        await refreshRuntimeGuidance();
      },
      onError(error) {
        toast.error(toErrorMessage(error));
      },
    }),
  );

  const openStartGate = useCallback(
    (
      card: RuntimeGuidanceCandidateCard,
      transition: RuntimeGuidanceCandidateCard["transitions"][number],
    ) => {
      setStartGateSelection({
        card,
        transition,
        input: buildStartGateInput(projectId, card, transition),
      });
    },
    [projectId],
  );

  const handleLaunchTransition = useCallback(
    (workflow: { workflowId: string; workflowKey?: string }) => {
      if (!startGateSelection) {
        return;
      }

      const launchDecision = resolveRuntimeGuidanceLaunchDecision({
        projectId,
        selection: startGateSelection,
        activeCards,
        workflow,
      });

      if (launchDecision.kind === "switch") {
        switchActiveTransitionExecutionMutation.mutate(launchDecision.input);
      } else {
        startTransitionExecutionMutation.mutate(launchDecision.input);
      }

      setStartGateSelection(null);
    },
    [
      activeCards,
      projectId,
      startGateSelection,
      startTransitionExecutionMutation,
      switchActiveTransitionExecutionMutation,
    ],
  );

  const startGateErrorMessage = startGateQuery.error ? toErrorMessage(startGateQuery.error) : null;
  const activeErrorMessage = activeGuidanceQuery.error
    ? toErrorMessage(activeGuidanceQuery.error)
    : null;
  const isLaunchingTransition =
    startTransitionExecutionMutation.isPending || switchActiveTransitionExecutionMutation.isPending;
  const launchLabel =
    startGateSelection?.card.workUnitContext.projectWorkUnitId &&
    activeCards.some(
      (card) =>
        card.projectWorkUnitId === startGateSelection.card.workUnitContext.projectWorkUnitId,
    )
      ? "Switch active transition"
      : "Start transition";

  return (
    <MethodologyWorkspaceShell
      title="Guidance"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Guidance" },
      ]}
    >
      <div
        className={cn(
          "grid gap-4",
          activeGuidanceQuery.isLoading && streamStatus === "connecting"
            ? "opacity-95"
            : "opacity-100",
        )}
      >
        <RuntimeGuidanceSections
          projectId={projectId}
          activeCards={activeCards}
          activeLoading={activeGuidanceQuery.isLoading}
          activeErrorMessage={activeErrorMessage}
          candidateCards={candidateCards}
          transitionResults={transitionResults}
          completedCandidateCards={completedCandidateCards}
          streamStatus={streamStatus}
          streamErrorMessage={streamErrorMessage}
          onOpenStartGate={openStartGate}
        />
      </div>

      <RuntimeStartGateDialog
        open={startGateSelection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStartGateSelection(null);
          }
        }}
        detail={(startGateQuery.data as GetTransitionStartGateDetailsOutput | null) ?? null}
        isLoading={startGateQuery.isLoading}
        errorMessage={startGateErrorMessage}
        onLaunch={handleLaunchTransition}
        isLaunching={isLaunchingTransition}
        launchLabel={launchLabel}
      />
    </MethodologyWorkspaceShell>
  );
}
