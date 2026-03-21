import type {
  MethodologyVersionDefinition,
  ValidationDiagnostic,
  ValidationResult,
} from "@chiron/contracts/methodology/version";

function makeDiagnostic(
  fields: Omit<ValidationDiagnostic, "timestamp" | "evidenceRef"> & {
    evidenceRef?: string | null;
  },
  timestamp: string,
): ValidationDiagnostic {
  return {
    ...fields,
    timestamp,
    evidenceRef: fields.evidenceRef ?? null,
  };
}

const ALLOWED_WORKFLOW_STEP_TYPES = new Set([
  "form",
  "agent",
  "action",
  "invoke",
  "branch",
  "display",
]);

function readTransitionKey(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybe = value as Record<string, unknown>;
  if (typeof maybe.transitionKey === "string") {
    return maybe.transitionKey;
  }

  if (typeof maybe.key === "string") {
    return maybe.key;
  }

  return null;
}

function collectCanonicalTransitionKeys(
  definition: MethodologyVersionDefinition,
): readonly string[] {
  const topLevel = definition.transitions
    .map(readTransitionKey)
    .filter((k): k is string => k !== null);
  if (topLevel.length > 0) {
    return topLevel;
  }

  const nested: string[] = [];
  for (const workUnit of definition.workUnitTypes) {
    if (!workUnit || typeof workUnit !== "object") {
      continue;
    }

    const lifecycleTransitions = Array.isArray(
      (workUnit as Record<string, unknown>).lifecycleTransitions,
    )
      ? ((workUnit as Record<string, unknown>).lifecycleTransitions as unknown[])
      : [];

    for (const transition of lifecycleTransitions) {
      const key = readTransitionKey(transition);
      if (key !== null) {
        nested.push(key);
      }
    }
  }

  return nested;
}

function normalizeBindings(
  definition: MethodologyVersionDefinition,
): Record<string, readonly string[]> {
  return definition.transitionWorkflowBindings ?? {};
}

/**
 * Validate a methodology version definition and return deterministic diagnostics.
 * Accepts an explicit `timestamp` so that equivalent inputs always produce
 * identical output (no internal clock dependency).
 */
export function validateDraftDefinition(
  definition: MethodologyVersionDefinition,
  timestamp: string,
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  if (definition.workUnitTypes.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        {
          code: "EMPTY_WORK_UNIT_TYPES",
          scope: "definition.workUnitTypes",
          blocking: true,
          required: "At least one work unit type for a publishable methodology",
          observed: "Empty array",
          remediation:
            "Add work unit type definitions before publishing (not required for draft save)",
        },
        timestamp,
      ),
    );
  }
  const transitionKeys = collectCanonicalTransitionKeys(definition);

  if (transitionKeys.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        {
          code: "EMPTY_TRANSITIONS",
          scope: "definition.transitions",
          blocking: true,
          required: "At least one transition for a publishable methodology",
          observed: "Empty array",
          remediation: "Add transition definitions before publishing (not required for draft save)",
        },
        timestamp,
      ),
    );
  }
  const transitionKeySet = new Set(transitionKeys);
  const bindingMap = normalizeBindings(definition);
  const bindingKeys = Object.keys(bindingMap).sort();
  for (const key of bindingKeys) {
    if (transitionKeySet.size > 0 && !transitionKeySet.has(key)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "UNRESOLVED_TRANSITION_BINDING",
            scope: `definition.transitionWorkflowBindings.${key}`,
            blocking: true,
            required: `Binding key '${key}' to reference a defined transition`,
            observed: `No transition with key '${key}' found in transitions array`,
            remediation: `Add a transition with key '${key}' or remove the binding`,
          },
          timestamp,
        ),
      );
    }
  }

  const workflowKeys = new Set<string>();
  const seenWorkflowKeys = new Set<string>();

  for (const workflow of definition.workflows ?? []) {
    if (seenWorkflowKeys.has(workflow.key)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "DUPLICATE_WORKFLOW_KEY",
            scope: `definition.workflows.${workflow.key}`,
            blocking: true,
            required: "Each workflow key to be unique within definition.workflows",
            observed: `Duplicate workflow key '${workflow.key}' found`,
            remediation: `Rename one workflow to a unique key; duplicate '${workflow.key}' is not allowed`,
          },
          timestamp,
        ),
      );
      continue;
    }

    seenWorkflowKeys.add(workflow.key);
    workflowKeys.add(workflow.key);

    const stepKeySet = new Set<string>();
    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();
    const entryEdgeTargets: string[] = [];
    const terminalEdges: Array<{ fromStepKey: string; edgeKey?: string }> = [];
    const routingKeysBySource = new Map<string, Set<string>>();

    for (const step of workflow.steps) {
      if (stepKeySet.has(step.key)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "DUPLICATE_WORKFLOW_STEP_KEY",
              scope: `definition.workflows.${workflow.key}.steps.${step.key}`,
              blocking: true,
              required: "Each step key to be unique per workflow",
              observed: `Duplicate step key '${step.key}' found in workflow '${workflow.key}'`,
              remediation: `Rename one duplicate step key '${step.key}' in workflow '${workflow.key}'`,
            },
            timestamp,
          ),
        );
      }

      stepKeySet.add(step.key);
      incomingCount.set(step.key, 0);
      outgoingCount.set(step.key, 0);

      if (!ALLOWED_WORKFLOW_STEP_TYPES.has(step.type)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "INVALID_WORKFLOW_STEP_TYPE",
              scope: `definition.workflows.${workflow.key}.steps.${step.key}.type`,
              blocking: true,
              required: "Step type to be one of form|agent|action|invoke|branch|display",
              observed: `Unsupported step type '${step.type}'`,
              remediation:
                "Use an allowed step type: form, agent, action, invoke, branch, or display",
            },
            timestamp,
          ),
        );
      }
    }

    for (const edge of workflow.edges) {
      if (edge.fromStepKey === null && edge.toStepKey === null) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "DEGENERATE_WORKFLOW_EDGE",
              scope: `definition.workflows.${workflow.key}.edges`,
              blocking: true,
              required: "Workflow edges to define at least one endpoint",
              observed: "Edge has both fromStepKey and toStepKey as null",
              remediation: "Set fromStepKey, toStepKey, or both to valid workflow step keys",
            },
            timestamp,
          ),
        );
        continue;
      }

      if (edge.fromStepKey !== null && !stepKeySet.has(edge.fromStepKey)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "UNRESOLVED_WORKFLOW_EDGE",
              scope: `definition.workflows.${workflow.key}.edges.${edge.fromStepKey}->${edge.toStepKey ?? "__terminal__"}`,
              blocking: true,
              required: "Workflow edges to reference existing step keys",
              observed: `Edge references missing fromStepKey='${edge.fromStepKey}'`,
              remediation:
                "Update edge endpoints to existing steps or create missing steps in the same workflow",
            },
            timestamp,
          ),
        );
        continue;
      }

      if (edge.toStepKey !== null && !stepKeySet.has(edge.toStepKey)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "UNRESOLVED_WORKFLOW_EDGE",
              scope: `definition.workflows.${workflow.key}.edges.${edge.fromStepKey ?? "__entry__"}->${edge.toStepKey}`,
              blocking: true,
              required: "Workflow edges to reference existing step keys",
              observed: `Edge references missing toStepKey='${edge.toStepKey}'`,
              remediation:
                "Update edge endpoints to existing steps or create missing steps in the same workflow",
            },
            timestamp,
          ),
        );
        continue;
      }

      if (edge.fromStepKey === null) {
        if (edge.toStepKey !== null) {
          entryEdgeTargets.push(edge.toStepKey);
          incomingCount.set(edge.toStepKey, (incomingCount.get(edge.toStepKey) ?? 0) + 1);
        }
      } else {
        outgoingCount.set(edge.fromStepKey, (outgoingCount.get(edge.fromStepKey) ?? 0) + 1);

        if (!routingKeysBySource.has(edge.fromStepKey)) {
          routingKeysBySource.set(edge.fromStepKey, new Set());
        }

        const routingKeys = routingKeysBySource.get(edge.fromStepKey);
        if (edge.edgeKey && routingKeys?.has(edge.edgeKey)) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "DUPLICATE_WORKFLOW_EDGE_KEY",
                scope: `definition.workflows.${workflow.key}.steps.${edge.fromStepKey}`,
                blocking: true,
                required: "Edge keys to be unique per source step",
                observed: `Duplicate edgeKey '${edge.edgeKey}' on source '${edge.fromStepKey}'`,
                remediation: `Use unique edgeKey values for outgoing edges from '${edge.fromStepKey}'`,
              },
              timestamp,
            ),
          );
        }

        if (edge.edgeKey) {
          routingKeys?.add(edge.edgeKey);
        }

        if (edge.toStepKey === null) {
          terminalEdges.push(
            edge.edgeKey === undefined
              ? { fromStepKey: edge.fromStepKey }
              : { fromStepKey: edge.fromStepKey, edgeKey: edge.edgeKey },
          );
        } else {
          incomingCount.set(edge.toStepKey, (incomingCount.get(edge.toStepKey) ?? 0) + 1);
        }
      }
    }

    if (entryEdgeTargets.length !== 1) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "INVALID_WORKFLOW_ENTRY_COUNT",
            scope: `definition.workflows.${workflow.key}.entry`,
            blocking: true,
            required: "Each workflow to have exactly one entry edge (fromStepKey = null)",
            observed: `Found ${entryEdgeTargets.length} entry edges`,
            remediation: "Adjust edges so exactly one edge starts from null",
          },
          timestamp,
        ),
      );
    }

    if (terminalEdges.length === 0) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "MISSING_WORKFLOW_TERMINAL",
            scope: `definition.workflows.${workflow.key}.terminal`,
            blocking: true,
            required: "Each workflow to include at least one terminal edge (toStepKey = null)",
            observed: "No terminal edges found",
            remediation: "Add one or more edges with toStepKey set to null",
          },
          timestamp,
        ),
      );
    }

    for (const edge of terminalEdges) {
      if (!edge.edgeKey) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "TERMINAL_EDGE_MISSING_KEY",
              scope: `definition.workflows.${workflow.key}.steps.${edge.fromStepKey}`,
              blocking: true,
              required: "Terminal edges to include an edgeKey for deterministic outcome selection",
              observed: `Terminal edge from '${edge.fromStepKey}' missing edgeKey`,
              remediation: "Assign a non-empty edgeKey to each terminal edge",
            },
            timestamp,
          ),
        );
      }
    }

    for (const step of workflow.steps.filter((candidate) => candidate.type === "branch")) {
      const outgoing = workflow.edges.filter((edge) => edge.fromStepKey === step.key);
      const labeledOutgoing = outgoing.filter((edge) => Boolean(edge.edgeKey));
      if (labeledOutgoing.length < 2) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "BRANCH_REQUIRES_MIN_TWO_OUTGOING",
              scope: `definition.workflows.${workflow.key}.steps.${step.key}`,
              blocking: true,
              required: "Branch steps to have at least two labeled outgoing edges",
              observed: `Found ${labeledOutgoing.length} labeled outgoing edge(s)`,
              remediation: "Add at least two outgoing branch edges with distinct edgeKey values",
            },
            timestamp,
          ),
        );
      }

      for (const edge of outgoing) {
        if (edge.condition === undefined || edge.condition === null) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "BRANCH_EDGE_MISSING_CONDITION",
                scope: `definition.workflows.${workflow.key}.edges.${edge.fromStepKey}->${edge.toStepKey}`,
                blocking: true,
                required: "Branch outgoing edges to include explicit conditions",
                observed: "Edge condition is missing",
                remediation:
                  "Provide a deterministic condition payload for each outgoing branch edge",
              },
              timestamp,
            ),
          );
        }
      }
    }

    for (const step of workflow.steps.filter((candidate) => candidate.type !== "branch")) {
      const outgoing = workflow.edges.filter((edge) => edge.fromStepKey === step.key);
      if (outgoing.length > 1 && outgoing.some((edge) => !edge.edgeKey)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "AMBIGUOUS_NON_BRANCH_ROUTING",
              scope: `definition.workflows.${workflow.key}.steps.${step.key}`,
              blocking: true,
              required:
                "Non-branch multi-route steps to use explicit edge keys for deterministic routing",
              observed: "Found multiple outgoing edges without full edgeKey labeling",
              remediation:
                "Label all outgoing edges with unique edgeKey values or use a branch step",
            },
            timestamp,
          ),
        );
      }
    }

    if (entryEdgeTargets.length === 1) {
      const entryStep = entryEdgeTargets[0];
      if (!entryStep) {
        continue;
      }

      const reachable = new Set<string>();
      const queue: string[] = [entryStep];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || reachable.has(current)) {
          continue;
        }
        reachable.add(current);

        const successors = workflow.edges
          .filter((edge) => edge.fromStepKey === current)
          .map((edge) => edge.toStepKey)
          .filter((key): key is string => key !== null);

        for (const successor of successors) {
          if (!reachable.has(successor)) {
            queue.push(successor);
          }
        }
      }

      for (const step of workflow.steps) {
        if (!reachable.has(step.key)) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "UNREACHABLE_WORKFLOW_STEP",
                scope: `definition.workflows.${workflow.key}.steps.${step.key}`,
                blocking: true,
                required: "All workflow steps to be reachable from the single entry step",
                observed: `Step '${step.key}' is unreachable from entry '${entryStep}'`,
                remediation: `Connect '${step.key}' to the workflow path or remove it`,
              },
              timestamp,
            ),
          );
        }
      }
    }
  }

  for (const transitionKey of bindingKeys) {
    const boundWorkflowKeys = [...(bindingMap[transitionKey] ?? [])].sort();

    if (boundWorkflowKeys.length === 0) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "EMPTY_TRANSITION_WORKFLOW_BINDING",
            scope: `definition.transitionWorkflowBindings.${transitionKey}`,
            blocking: true,
            required: `Transition '${transitionKey}' to bind at least one workflow`,
            observed: "Empty workflow binding array",
            remediation: `Bind one or more workflow keys to transition '${transitionKey}'`,
          },
          timestamp,
        ),
      );
    }

    for (const workflowKey of boundWorkflowKeys) {
      if (!workflowKeys.has(workflowKey)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "UNRESOLVED_WORKFLOW_BINDING",
              scope: `definition.transitionWorkflowBindings.${transitionKey}.${workflowKey}`,
              blocking: true,
              required: `Workflow binding for transition '${transitionKey}' to reference a declared workflow`,
              observed: `No workflow with key '${workflowKey}' found`,
              remediation: `Declare workflow '${workflowKey}' in definition.workflows or remove the binding`,
            },
            timestamp,
          ),
        );
      }
    }
  }

  diagnostics.sort((a, b) => {
    const scopeCmp = a.scope.localeCompare(b.scope);
    if (scopeCmp !== 0) return scopeCmp;
    return a.code.localeCompare(b.code);
  });
  return {
    valid: diagnostics.filter((d) => d.blocking).length === 0,
    diagnostics,
  };
}
