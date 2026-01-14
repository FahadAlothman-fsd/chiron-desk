import { db, eq, type Workflow, type WorkflowStep, workflowSteps, workflows } from "@chiron/db";

/**
 * Workflow Loader Service
 * Loads workflows and their steps from the database with validation
 */

export interface LoadedWorkflow {
  workflow: Workflow;
  steps: WorkflowStep[];
}

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

/**
 * Load a workflow and its steps from the database
 * @param workflowId - UUID of the workflow to load
 * @returns Loaded workflow with validated and sorted steps
 * @throws WorkflowValidationError if validation fails
 */
export async function loadWorkflow(workflowId: string): Promise<LoadedWorkflow> {
  // Query workflow with eager loading of steps
  const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);

  if (!workflow) {
    throw new WorkflowValidationError(`Workflow not found: ${workflowId}`);
  }

  // Load all steps for this workflow
  const steps = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.workflowId, workflowId))
    .orderBy(workflowSteps.stepNumber);

  // Validate workflow structure
  validateWorkflowStructure(steps);

  return {
    workflow,
    steps,
  };
}

/**
 * Validate workflow structure
 * - Allow gaps in step numbers (warn but don't block)
 * - Verify nextStepNumber references point to valid steps
 * - Detect cycles: BLOCK if no branch steps, WARN if cycle has branch
 * - Track unknown step types (warn during load)
 */
function validateWorkflowStructure(steps: WorkflowStep[]): void {
  if (steps.length === 0) {
    // Empty workflow is valid (Story 1.4 tests this)
    return;
  }

  const stepNumberSet = new Set(steps.map((s) => s.stepNumber));
  const warnings: string[] = [];

  // Check for duplicate step numbers
  if (stepNumberSet.size !== steps.length) {
    throw new WorkflowValidationError("Duplicate step numbers found in workflow");
  }

  // Check for gaps in step numbers (warn but allow)
  const sortedNumbers = Array.from(stepNumberSet).toSorted((a, b) => a - b);
  for (let i = 0; i < sortedNumbers.length - 1; i++) {
    if (sortedNumbers[i + 1] - sortedNumbers[i] > 1) {
      warnings.push(`Gap in step numbers: ${sortedNumbers[i]} -> ${sortedNumbers[i + 1]}`);
    }
  }

  // Verify nextStepNumber references
  for (const step of steps) {
    if (step.nextStepNumber !== null) {
      if (!stepNumberSet.has(step.nextStepNumber)) {
        throw new WorkflowValidationError(
          `Step ${step.stepNumber} references invalid nextStepNumber: ${step.nextStepNumber}`,
        );
      }
    }
  }

  // Cycle detection: Build graph and detect cycles
  const hasBranchSteps = steps.some((s) => s.stepType === "branch");
  const cycles = detectCycles(steps);

  if (cycles.length > 0) {
    const cycleDescriptions = cycles.map((cycle) => cycle.join(" -> ")).join("; ");

    if (!hasBranchSteps) {
      // No branches = guaranteed infinite loop
      throw new WorkflowValidationError(
        `Cycle detected in workflow without branch steps: ${cycleDescriptions}`,
      );
    }
    // Has branches = might be valid state machine pattern
    warnings.push(`Cycle detected (OK for state machines): ${cycleDescriptions}`);
  }

  // Log warnings if any
  if (warnings.length > 0) {
    console.warn("Workflow validation warnings:", warnings.join("; "));
  }
}

/**
 * Detect cycles in workflow graph using DFS
 * @returns Array of cycles (each cycle is array of step numbers)
 */
function detectCycles(steps: WorkflowStep[]): number[][] {
  const cycles: number[][] = [];
  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  // Build adjacency list
  const graph = new Map<number, number>();
  for (const step of steps) {
    if (step.nextStepNumber !== null) {
      graph.set(step.stepNumber, step.nextStepNumber);
    }
  }

  function dfs(stepNum: number, path: number[]): void {
    if (recursionStack.has(stepNum)) {
      // Found cycle - extract cycle from path
      const cycleStart = path.indexOf(stepNum);
      cycles.push([...path.slice(cycleStart), stepNum]);
      return;
    }

    if (visited.has(stepNum)) {
      return;
    }

    visited.add(stepNum);
    recursionStack.add(stepNum);

    const nextStep = graph.get(stepNum);
    if (nextStep !== undefined) {
      dfs(nextStep, [...path, stepNum]);
    }

    recursionStack.delete(stepNum);
  }

  // Run DFS from each step
  for (const step of steps) {
    if (!visited.has(step.stepNumber)) {
      dfs(step.stepNumber, []);
    }
  }

  return cycles;
}
