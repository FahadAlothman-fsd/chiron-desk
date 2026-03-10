import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Result } from "better-result";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AllowedValuesChipEditor } from "@/features/methodologies/fact-editor-controls";
import {
  createAllowedValuesValidation,
  getAllowedValues,
  getUiValidationKind,
} from "@/features/methodologies/fact-validation";
import { type MethodologyDetails } from "@/features/methodologies/foundation";
import {
  createEmptyMethodologyFact,
  MethodologyFactsInventory,
  parseMethodologyFacts,
  serializeMethodologyFacts,
} from "@/features/methodologies/methodology-facts";
import {
  createDraftFromProjection,
  createEmptyMethodologyVersionWorkspaceDraft,
  parseWorkspaceDraftForPersistence,
  type DraftProjectionShape,
  type FactEditorValue,
  type MethodologyVersionWorkspaceDraft,
} from "@/features/methodologies/version-workspace";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId/facts")({
  component: MethodologyVersionFactsRoute,
});

type FactEditorStep = "contract" | "guidance";

type FactEditorFormValues = {
  displayName: string;
  factKey: string;
  factType: FactEditorValue["factType"];
  defaultValue: string;
  description: string;
  humanMarkdown: string;
  agentMarkdown: string;
  validationType: "none" | "path" | "allowed-values" | "json-schema";
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
  jsonSchema: string;
};

const fieldClassName =
  "h-9 border border-border/70 bg-background px-3 text-sm text-foreground outline-none rounded-none";
const textareaClassName =
  "min-h-28 border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none rounded-none";

function factToFormValues(fact: FactEditorValue): FactEditorFormValues {
  const validation = fact.validation as
    | {
        kind?: string;
        path?: {
          pathKind?: "file" | "directory";
          normalization?: { trimWhitespace?: boolean };
          safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
        };
        rules?: Array<{ kind?: string; values?: string[] }>;
        schema?: unknown;
      }
    | undefined;
  const allowedValues = getAllowedValues(validation);
  const validationType = getUiValidationKind(validation);

  return {
    displayName: fact.name ?? "",
    factKey: fact.key,
    factType: fact.factType,
    defaultValue: fact.defaultValue === undefined ? "" : String(fact.defaultValue),
    description: fact.description ?? "",
    humanMarkdown:
      ((fact.guidance?.human as { markdown?: string; short?: string; long?: string } | undefined)
        ?.markdown ??
        (fact.guidance?.human as { short?: string; long?: string } | undefined)?.short ??
        "") ||
      "",
    agentMarkdown:
      ((fact.guidance?.agent as { markdown?: string; intent?: string } | undefined)?.markdown ??
        (fact.guidance?.agent as { intent?: string } | undefined)?.intent ??
        "") ||
      "",
    validationType,
    pathKind: validation?.path?.pathKind === "directory" ? "directory" : "file",
    trimWhitespace: validation?.path?.normalization?.trimWhitespace ?? true,
    disallowAbsolute: validation?.path?.safety?.disallowAbsolute ?? true,
    preventTraversal: validation?.path?.safety?.preventTraversal ?? true,
    allowedValues: allowedValues.join("\n"),
    jsonSchema:
      validation?.kind === "json-schema" ? JSON.stringify(validation.schema ?? {}, null, 2) : "{}",
  };
}

function formValuesToFact(
  values: FactEditorFormValues,
  baseFact: FactEditorValue,
): FactEditorValue {
  const validation: FactEditorValue["validation"] | Record<string, unknown> =
    values.validationType === "path"
      ? {
          kind: "path",
          path: {
            pathKind: values.pathKind,
            normalization: {
              mode: "posix",
              trimWhitespace: values.trimWhitespace,
            },
            safety: {
              disallowAbsolute: values.disallowAbsolute,
              preventTraversal: values.preventTraversal,
            },
          },
        }
      : values.validationType === "json-schema"
        ? {
            kind: "json-schema",
            schemaDialect: "draft-2020-12",
            schema: Result.try(() => JSON.parse(values.jsonSchema)).unwrapOr({}),
          }
        : values.validationType === "allowed-values"
          ? createAllowedValuesValidation(
              values.allowedValues
                .split(/\r?\n/g)
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
            )
          : { kind: "none" };

  return {
    ...baseFact,
    name: values.displayName,
    key: values.factKey,
    factType: values.factType,
    defaultValue: values.defaultValue.length > 0 ? values.defaultValue : undefined,
    description: values.description.length > 0 ? values.description : undefined,
    guidance:
      values.humanMarkdown.trim().length > 0 || values.agentMarkdown.trim().length > 0
        ? {
            human:
              values.humanMarkdown.trim().length > 0 ? { short: values.humanMarkdown } : undefined,
            agent:
              values.agentMarkdown.trim().length > 0 ? { intent: values.agentMarkdown } : undefined,
          }
        : undefined,
    validation: validation as FactEditorValue["validation"],
  };
}

function FactEditorDialog({
  open,
  onOpenChange,
  initialFact,
  isEditing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFact: FactEditorValue;
  isEditing: boolean;
  onSave: (fact: FactEditorValue) => Promise<void>;
}) {
  const [step, setStep] = useState<FactEditorStep>("contract");
  const form = useForm({
    defaultValues: factToFormValues(initialFact),
    onSubmit: async ({ value }) => {
      await onSave(formValuesToFact(value, initialFact));
    },
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Popup className="chiron-cut-frame-thin max-h-[calc(100dvh-3rem)] w-[min(46rem,calc(100vw-2rem))] overflow-y-auto bg-background p-4 outline-none">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <div className="space-y-2">
                <DialogPrimitive.Title className="text-base font-semibold uppercase tracking-[0.08em]">
                  {isEditing ? "Edit Fact" : "Add Fact"}
                </DialogPrimitive.Title>
                <div className="flex items-center gap-2">
                  {(
                    [
                      ["contract", "Contract"],
                      ["guidance", "Guidance"],
                    ] as const
                  ).map(([stepValue, label], index) => {
                    const active = step === stepValue;
                    return (
                      <div key={stepValue} className="flex items-center gap-2">
                        <button
                          type="button"
                          className={
                            active
                              ? "chiron-frame-flat px-3 py-1 text-xs uppercase tracking-[0.14em]"
                              : "border border-border/70 px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                          }
                          onClick={() => setStep(stepValue)}
                        >
                          {label}
                        </button>
                        {index === 0 ? (
                          <span className="text-xs text-muted-foreground">/</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {step === "contract" ? (
                <Card
                  frame="flat"
                  tone="contracts"
                  className="rounded-none border-0 bg-transparent shadow-none"
                >
                  <CardHeader className="pb-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Contract
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <form.Field name="displayName">
                        {(field) => (
                          <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Display name
                            <input
                              className={fieldClassName}
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                          </label>
                        )}
                      </form.Field>
                      <form.Field name="factKey">
                        {(field) => (
                          <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Fact key
                            <input
                              className={fieldClassName}
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                          </label>
                        )}
                      </form.Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <form.Field name="factType">
                        {(field) => (
                          <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Fact type
                            <select
                              aria-label="Fact type"
                              className={fieldClassName}
                              value={field.state.value}
                              onChange={(event) =>
                                field.handleChange(
                                  event.target.value as FactEditorValue["factType"],
                                )
                              }
                            >
                              <option value="string">string</option>
                              <option value="number">number</option>
                              <option value="boolean">boolean</option>
                              <option value="json">json</option>
                            </select>
                          </label>
                        )}
                      </form.Field>
                      <form.Field name="defaultValue">
                        {(field) => (
                          <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Default value
                            <input
                              className={fieldClassName}
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                            />
                          </label>
                        )}
                      </form.Field>
                    </div>
                    <form.Field name="validationType">
                      {(field) => (
                        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Validation type
                          <select
                            aria-label="Validation type"
                            className={fieldClassName}
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(
                                event.target.value as FactEditorFormValues["validationType"],
                              )
                            }
                          >
                            <option value="none">none</option>
                            <option value="path">path</option>
                            <option value="allowed-values">allowed values</option>
                            <option value="json-schema">json schema</option>
                          </select>
                        </label>
                      )}
                    </form.Field>
                    <form.Subscribe selector={(state) => state.values.validationType}>
                      {(validationType) =>
                        validationType === "path" ? (
                          <Card
                            frame="flat"
                            tone="contracts"
                            className="rounded-none border-0 bg-transparent shadow-none"
                          >
                            <CardContent className="grid gap-3 px-0 pb-0">
                              <form.Field name="pathKind">
                                {(field) => (
                                  <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                    Path kind
                                    <select
                                      aria-label="Path kind"
                                      className={fieldClassName}
                                      value={field.state.value}
                                      onChange={(event) =>
                                        field.handleChange(
                                          event.target.value as "file" | "directory",
                                        )
                                      }
                                    >
                                      <option value="file">file</option>
                                      <option value="directory">directory</option>
                                    </select>
                                  </label>
                                )}
                              </form.Field>
                              <div className="grid gap-2 md:grid-cols-3">
                                <form.Field name="trimWhitespace">
                                  {(field) => (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <input
                                        aria-label="Trim whitespace"
                                        type="checkbox"
                                        checked={field.state.value}
                                        onChange={(event) =>
                                          field.handleChange(event.target.checked)
                                        }
                                      />
                                      Trim whitespace
                                    </label>
                                  )}
                                </form.Field>
                                <form.Field name="disallowAbsolute">
                                  {(field) => (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <input
                                        aria-label="Disallow absolute"
                                        type="checkbox"
                                        checked={field.state.value}
                                        onChange={(event) =>
                                          field.handleChange(event.target.checked)
                                        }
                                      />
                                      Disallow absolute
                                    </label>
                                  )}
                                </form.Field>
                                <form.Field name="preventTraversal">
                                  {(field) => (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <input
                                        aria-label="Prevent traversal"
                                        type="checkbox"
                                        checked={field.state.value}
                                        onChange={(event) =>
                                          field.handleChange(event.target.checked)
                                        }
                                      />
                                      Prevent traversal
                                    </label>
                                  )}
                                </form.Field>
                              </div>
                            </CardContent>
                          </Card>
                        ) : validationType === "allowed-values" ? (
                          <form.Field name="allowedValues">
                            {(field) => (
                              <div className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                <span>Allowed values</span>
                                <AllowedValuesChipEditor
                                  values={field.state.value
                                    .split(/\r?\n/g)
                                    .map((value) => value.trim())
                                    .filter((value) => value.length > 0)}
                                  onChange={(values) => field.handleChange(values.join("\n"))}
                                />
                              </div>
                            )}
                          </form.Field>
                        ) : validationType === "json-schema" ? (
                          <form.Field name="jsonSchema">
                            {(field) => (
                              <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                JSON schema
                                <textarea
                                  aria-label="JSON schema"
                                  className={textareaClassName}
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                />
                              </label>
                            )}
                          </form.Field>
                        ) : null
                      }
                    </form.Subscribe>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  frame="flat"
                  tone="context"
                  className="rounded-none border-0 bg-transparent shadow-none"
                >
                  <CardHeader className="pb-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Guidance
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <form.Field name="description">
                      {(field) => (
                        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Description
                          <textarea
                            className={textareaClassName}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        </label>
                      )}
                    </form.Field>
                    <form.Field name="humanMarkdown">
                      {(field) => (
                        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Human markdown
                          <textarea
                            aria-label="Human markdown"
                            className={textareaClassName}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        </label>
                      )}
                    </form.Field>
                    <form.Field name="agentMarkdown">
                      {(field) => (
                        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Agent markdown
                          <textarea
                            aria-label="Agent markdown"
                            className={textareaClassName}
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        </label>
                      )}
                    </form.Field>
                  </CardContent>
                </Card>
              )}

              <Card
                frame="flat"
                tone="navigation"
                className="rounded-none border-0 bg-transparent shadow-none"
              >
                <CardFooter className="justify-end gap-2 pt-0">
                  <Button
                    variant="outline"
                    className="rounded-none"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  {step === "guidance" ? (
                    <Button
                      variant="outline"
                      className="rounded-none"
                      type="button"
                      onClick={() => setStep("contract")}
                    >
                      Back
                    </Button>
                  ) : null}
                  {step === "contract" ? (
                    <Button
                      className="rounded-none"
                      type="button"
                      onClick={() => setStep("guidance")}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button className="rounded-none" type="submit">
                      Save
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </form>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function MethodologyVersionFactsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const initialDraft = useMemo(
    () => createEmptyMethodologyVersionWorkspaceDraft(methodologyId),
    [methodologyId],
  );
  const [draft, setDraft] = useState<MethodologyVersionWorkspaceDraft>(initialDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editorFact, setEditorFact] = useState<FactEditorValue>(createEmptyMethodologyFact());
  const [guidanceFactId, setGuidanceFactId] = useState<string | null>(null);
  const [deleteFactId, setDeleteFactId] = useState<string | null>(null);

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const detailsQuery = useQuery(detailsQueryOptions);
  const details = (detailsQuery.data as MethodologyDetails | undefined) ?? null;
  const currentVersion = details?.versions.find((version) => version.id === versionId) ?? null;
  const draftQueryOptions = orpc.methodology.getDraftProjection.queryOptions({
    input: { versionId },
  });
  const draftQuery = useQuery(draftQueryOptions);
  const updateWorkflowsMutation = useMutation(
    orpc.methodology.updateDraftWorkflows.mutationOptions(),
  );

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setDraft(createDraftFromProjection(methodologyId, draftQuery.data as DraftProjectionShape));
  }, [draftQuery.data, methodologyId]);

  const facts = useMemo(
    () => parseMethodologyFacts(draft.factDefinitionsJson),
    [draft.factDefinitionsJson],
  );

  const findFactById = (factId: string): FactEditorValue | null => {
    for (const [index, fact] of facts.entries()) {
      const rowId = fact.__uiId ?? `fact-row-${index}`;
      if (rowId === factId) {
        return fact;
      }
    }

    return null;
  };

  const openCreateDialog = () => {
    setEditingFactId(null);
    setEditorFact(createEmptyMethodologyFact());
    setEditorOpen(true);
  };

  const openEditDialog = (factId: string) => {
    const existing = findFactById(factId);
    if (!existing) {
      return;
    }

    setEditingFactId(factId);
    setEditorFact(existing);
    setEditorOpen(true);
  };

  const selectedGuidanceFact = guidanceFactId ? findFactById(guidanceFactId) : null;
  const guidanceHuman = (
    (
      selectedGuidanceFact?.guidance?.human as
        | { markdown?: string; short?: string; long?: string }
        | undefined
    )?.markdown ??
    (selectedGuidanceFact?.guidance?.human as { short?: string; long?: string } | undefined)
      ?.short ??
    (selectedGuidanceFact?.guidance?.human as { short?: string; long?: string } | undefined)
      ?.long ??
    ""
  ).trim();
  const guidanceAgent = (
    (selectedGuidanceFact?.guidance?.agent as { markdown?: string; intent?: string } | undefined)
      ?.markdown ??
    (selectedGuidanceFact?.guidance?.agent as { intent?: string } | undefined)?.intent ??
    ""
  ).trim();

  const persistFacts = async (nextFacts: FactEditorValue[], successMessage: string) => {
    if (updateWorkflowsMutation.isPending) {
      return;
    }

    const nextDraft = {
      ...draft,
      factDefinitionsJson: serializeMethodologyFacts(nextFacts),
    };
    setDraft(nextDraft);

    const parsed = parseWorkspaceDraftForPersistence(nextDraft);
    if (parsed.diagnostics.length > 0) {
      return;
    }

    const saveResult = await Result.tryPromise({
      try: async () => {
        await updateWorkflowsMutation.mutateAsync({
          versionId,
          workflows: parsed.workflows.workflows as never,
          transitionWorkflowBindings: parsed.workflows.transitionWorkflowBindings as never,
          guidance: parsed.workflows.guidance as never,
          factDefinitions: parsed.workflows.factDefinitions as never,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey }),
        ]);

        const refreshedDraft = await draftQuery.refetch();
        if (refreshedDraft.data) {
          setDraft(
            createDraftFromProjection(methodologyId, refreshedDraft.data as DraftProjectionShape),
          );
        }

        toast.success(successMessage);
      },
      catch: (error) => error,
    });

    if (saveResult.isErr()) {
      return;
    }
  };

  const deleteFact = async () => {
    if (!deleteFactId) {
      return;
    }

    await persistFacts(
      facts.filter((fact, index) => {
        const rowId = fact.__uiId ?? `fact-row-${index}`;
        return rowId !== deleteFactId;
      }),
      "Fact deleted",
    );
    setDeleteFactId(null);
  };

  const saveEditorFact = async (nextFact: FactEditorValue) => {
    const nextFacts = editingFactId
      ? facts.map((fact, index) => {
          const rowId = fact.__uiId ?? `fact-row-${index}`;
          return rowId === editingFactId ? nextFact : fact;
        })
      : [...facts, nextFact];

    await persistFacts(nextFacts, "Fact saved");
    setEditorOpen(false);
    setEditingFactId(null);
    setEditorFact(createEmptyMethodologyFact());
  };

  return (
    <MethodologyWorkspaceShell
      title="Methodology Facts"
      stateLabel={
        detailsQuery.isLoading || draftQuery.isLoading
          ? "loading"
          : detailsQuery.isError || draftQuery.isError
            ? "failed"
            : "success"
      }
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        {
          label: "Versions",
          to: "/methodologies/$methodologyId/versions",
          params: { methodologyId },
        },
        {
          label: currentVersion?.displayName ?? versionId,
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: { methodologyId, versionId },
        },
        { label: "Facts" },
      ]}
    >
      {detailsQuery.isLoading ? <p className="text-sm">Loading methodology facts...</p> : null}
      {detailsQuery.isError ? (
        <p className="text-sm">State: failed - Unable to load methodology details.</p>
      ) : null}

      {details ? (
        <div className="space-y-4">
          <section className="border border-border/80 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Methodology Facts
                </p>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Fact Inventory
                </p>
                <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em]">
                  {details.displayName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Editing contract for {currentVersion?.displayName ?? versionId}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-none" onClick={openCreateDialog}>
                  Add Fact
                </Button>
                <Link
                  to="/methodologies/$methodologyId/versions/$versionId"
                  params={{ methodologyId, versionId }}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open Workspace
                </Link>
                <Link
                  to="/methodologies/$methodologyId/versions"
                  params={{ methodologyId }}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open Versions
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <MethodologyFactsInventory
                facts={facts}
                onViewGuidance={setGuidanceFactId}
                onEditFact={openEditDialog}
                onDeleteFact={setDeleteFactId}
              />
            </div>
          </section>

          <FactEditorDialog
            key={`${editingFactId ?? "new"}-${editorOpen ? "open" : "closed"}`}
            open={editorOpen}
            onOpenChange={setEditorOpen}
            initialFact={editorFact}
            isEditing={editingFactId !== null}
            onSave={saveEditorFact}
          />

          <DialogPrimitive.Root
            open={guidanceFactId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setGuidanceFactId(null);
              }
            }}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg outline-none">
                <DialogPrimitive.Title className="text-base font-semibold uppercase tracking-[0.08em]">
                  Guidance
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-xs text-muted-foreground">
                  Review the stored methodology guidance before editing.
                </DialogPrimitive.Description>
                <div className="mt-4 space-y-4 text-sm">
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Human
                    </h3>
                    <div className="border border-border/70 p-3 text-sm leading-6">
                      {guidanceHuman ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{guidanceHuman}</ReactMarkdown>
                      ) : (
                        "-"
                      )}
                    </div>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Agent
                    </h3>
                    <div className="border border-border/70 p-3 text-sm leading-6">
                      {guidanceAgent ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{guidanceAgent}</ReactMarkdown>
                      ) : (
                        "-"
                      )}
                    </div>
                  </section>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button className="rounded-none" onClick={() => setGuidanceFactId(null)}>
                    Close
                  </Button>
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <DialogPrimitive.Root
            open={deleteFactId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeleteFactId(null);
              }
            }}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg outline-none">
                <DialogPrimitive.Title className="text-base font-semibold uppercase tracking-[0.08em]">
                  Delete Fact
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                  This will remove this fact from the methodology contract.
                </DialogPrimitive.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="rounded-none"
                    onClick={() => setDeleteFactId(null)}
                  >
                    Cancel
                  </Button>
                  <Button className="rounded-none" onClick={() => void deleteFact()}>
                    Delete
                  </Button>
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
