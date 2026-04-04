import { useEffect, useMemo, useState } from "react";
import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";

import { Button } from "../../components/ui/button";

import { EdgeDialog, FormStepDialog, WorkflowMetadataDialog } from "./dialogs";
import { StepListInspector } from "./step-list-inspector";
import { StepTypesGrid, WORKFLOW_EDITOR_GEOFORM_CODES } from "./step-types-grid";
import type {
  WorkflowContextFactDefinitionItem,
  WorkflowEditorEdge,
  WorkflowEditorMetadata,
  WorkflowEditorSelection,
  WorkflowEditorStep,
} from "./types";
import { WorkflowCanvas } from "./workflow-canvas";

type WorkflowEditorShellProps = {
  metadata: WorkflowEditorMetadata;
  initialSteps: readonly WorkflowEditorStep[];
  initialEdges: readonly WorkflowEditorEdge[];
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  onSaveMetadata: (metadata: WorkflowEditorMetadata) => Promise<void>;
  onCreateFormStep?: (payload: FormStepPayload) => Promise<void>;
  onUpdateFormStep?: (stepId: string, payload: FormStepPayload) => Promise<void>;
  onCreateEdge?: (edge: WorkflowEditorEdge) => Promise<void>;
  onUpdateEdge?: (edgeId: string, descriptionMarkdown: string) => Promise<void>;
  onDeleteEdge?: (edgeId: string) => Promise<void>;
};

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function WorkflowEditorShell({
  metadata,
  initialSteps,
  initialEdges,
  contextFactDefinitions,
  onSaveMetadata,
  onCreateFormStep,
  onUpdateFormStep,
  onCreateEdge,
  onUpdateEdge,
  onDeleteEdge,
}: WorkflowEditorShellProps) {
  const [steps, setSteps] = useState<WorkflowEditorStep[]>([...initialSteps]);
  const [edges, setEdges] = useState<WorkflowEditorEdge[]>([...initialEdges]);
  const [selection, setSelection] = useState<WorkflowEditorSelection>(null);
  const [edgeGuardMessage, setEdgeGuardMessage] = useState<string | null>(null);

  const [isFormDialogOpen, setFormDialogOpen] = useState(false);
  const [formDialogMode, setFormDialogMode] = useState<"create" | "edit">("create");

  const [isEdgeDialogOpen, setEdgeDialogOpen] = useState(false);
  const [isMetadataDialogOpen, setMetadataDialogOpen] = useState(false);

  useEffect(() => {
    setSteps([...initialSteps]);
  }, [initialSteps]);

  useEffect(() => {
    setEdges([...initialEdges]);
  }, [initialEdges]);

  const selectedStep = useMemo(
    () =>
      selection?.kind === "step"
        ? steps.find((step) => step.stepId === selection.stepId)
        : undefined,
    [selection, steps],
  );
  const selectedEdge = useMemo(
    () =>
      selection?.kind === "edge"
        ? edges.find((edge) => edge.edgeId === selection.edgeId)
        : undefined,
    [edges, selection],
  );

  const openCreateFormDialog = () => {
    setFormDialogMode("create");
    setFormDialogOpen(true);
  };

  const openEditFormDialog = () => {
    if (!selectedStep) {
      return;
    }
    setFormDialogMode("edit");
    setFormDialogOpen(true);
  };

  const tryCreateEdge = ({
    sourceStepKey,
    targetStepKey,
  }: {
    sourceStepKey: string;
    targetStepKey: string;
  }) => {
    if (sourceStepKey === targetStepKey) {
      setEdgeGuardMessage("A step cannot connect to itself.");
      return;
    }

    if (edges.some((edge) => edge.fromStepKey === sourceStepKey)) {
      setEdgeGuardMessage("Slice-1 allows only one outgoing edge per step.");
      return;
    }

    setEdgeGuardMessage(null);

    const nextEdge: WorkflowEditorEdge = {
      edgeId: createLocalId("edge"),
      fromStepKey: sourceStepKey,
      toStepKey: targetStepKey,
      descriptionMarkdown: "",
    };

    setEdges((previous) => [...previous, nextEdge]);
    setSelection({ kind: "edge", edgeId: nextEdge.edgeId });
    void onCreateEdge?.(nextEdge);
  };

  return (
    <main className="space-y-3">
      <header className="chiron-frame-flat chiron-tone-navigation flex flex-wrap items-center justify-between gap-3 bg-[#07090b] p-3 md:p-4">
        <div className="grid gap-1">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Workflow Editor
          </p>
          <h1 className="font-geist-pixel-square text-lg font-semibold uppercase tracking-[0.12em] md:text-xl">
            {metadata.displayName || metadata.key}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={() => setMetadataDialogOpen(true)}>
          Edit workflow metadata
        </Button>
      </header>

      {edgeGuardMessage ? (
        <p
          role="alert"
          className="chiron-frame-flat border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {edgeGuardMessage}
        </p>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="chiron-frame-flat chiron-tone-canvas grid gap-2 bg-[#07090b] p-2">
          {/* <div className="grid grid-cols-6 gap-1"> */}
          {/*   {WORKFLOW_EDITOR_GEOFORM_CODES.map((code) => ( */}
          {/*     <div */}
          {/*       key={code} */}
          {/*       aria-hidden="true" */}
          {/*       className="chiron-frame-flat flex h-8 items-center justify-center bg-background/60 font-geist-pixel-square text-[0.72rem] uppercase tracking-[0.14em]" */}
          {/*     > */}
          {/*       {code} */}
          {/*     </div> */}
          {/*   ))} */}
          {/* </div> */}

          <StepTypesGrid onCreateFormStep={openCreateFormDialog} />

          <StepListInspector
            steps={steps}
            edges={edges}
            selection={selection}
            onSelectStep={(stepId) => {
              setEdgeGuardMessage(null);
              setSelection({ kind: "step", stepId });
            }}
            onSelectEdge={(edgeId) => {
              setEdgeGuardMessage(null);
              setSelection({ kind: "edge", edgeId });
            }}
            onClearSelection={() => {
              setEdgeGuardMessage(null);
              setSelection(null);
            }}
            onCreateFormStep={openCreateFormDialog}
            onEditSelectedStep={openEditFormDialog}
            onEditSelectedEdge={() => setEdgeDialogOpen(true)}
            onConnectSteps={(sourceStepKey, targetStepKey) =>
              tryCreateEdge({ sourceStepKey, targetStepKey })
            }
          />

          <section className="chiron-frame-flat grid gap-2 p-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Context Fact Definitions
            </p>
            {contextFactDefinitions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No context fact definitions configured yet.
              </p>
            ) : (
              <ul className="grid gap-1">
                {contextFactDefinitions.map((fact) => (
                  <li
                    key={fact.contextFactDefinitionId}
                    className="chiron-frame-flat grid gap-0.5 px-2 py-1.5 text-xs"
                  >
                    <p className="font-medium uppercase tracking-[0.1em]">{fact.key}</p>
                    <p className="text-muted-foreground">
                      {fact.kind}
                      {fact.valueType ? ` · ${fact.valueType}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <WorkflowCanvas
          steps={steps}
          edges={edges}
          selection={selection}
          errorMessage={edgeGuardMessage}
          onSelectStep={(stepId) => {
            setSelection({ kind: "step", stepId });
            setEdgeGuardMessage(null);
          }}
          onSelectEdge={(edgeId) => {
            setSelection({ kind: "edge", edgeId });
            setEdgeGuardMessage(null);
          }}
          onConnect={tryCreateEdge}
        />
      </div>

      <FormStepDialog
        open={isFormDialogOpen}
        mode={formDialogMode}
        step={formDialogMode === "edit" ? selectedStep : undefined}
        onOpenChange={setFormDialogOpen}
        onSave={async (payload) => {
          setEdgeGuardMessage(null);
          if (formDialogMode === "edit" && selectedStep) {
            setSteps((previous) =>
              previous.map((entry) =>
                entry.stepId === selectedStep.stepId
                  ? {
                      ...entry,
                      payload,
                    }
                  : entry,
              ),
            );
            await onUpdateFormStep?.(selectedStep.stepId, payload);
          } else {
            const nextStep: WorkflowEditorStep = {
              stepId: createLocalId("step"),
              stepType: "form",
              payload,
            };
            setSteps((previous) => [...previous, nextStep]);
            await onCreateFormStep?.(payload);
          }
          setFormDialogOpen(false);
        }}
      />

      <EdgeDialog
        open={isEdgeDialogOpen}
        edge={selectedEdge}
        onOpenChange={setEdgeDialogOpen}
        onSave={async (descriptionMarkdown) => {
          if (!selectedEdge) {
            return;
          }
          setEdges((previous) =>
            previous.map((entry) =>
              entry.edgeId === selectedEdge.edgeId
                ? {
                    ...entry,
                    descriptionMarkdown,
                  }
                : entry,
            ),
          );
          await onUpdateEdge?.(selectedEdge.edgeId, descriptionMarkdown);
          setEdgeDialogOpen(false);
        }}
        onDelete={async () => {
          if (!selectedEdge) {
            return;
          }
          setEdges((previous) => previous.filter((entry) => entry.edgeId !== selectedEdge.edgeId));
          setSelection(null);
          setEdgeDialogOpen(false);
          await onDeleteEdge?.(selectedEdge.edgeId);
        }}
      />

      <WorkflowMetadataDialog
        open={isMetadataDialogOpen}
        metadata={metadata}
        onOpenChange={setMetadataDialogOpen}
        onSave={async (nextMetadata) => {
          await onSaveMetadata(nextMetadata);
          setMetadataDialogOpen(false);
        }}
      />
    </main>
  );
}
