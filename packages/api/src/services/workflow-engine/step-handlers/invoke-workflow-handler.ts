import type { InvokeWorkflowStepConfig, WorkflowStep } from "@chiron/db";
import { db } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";

/**
 * InvokeWorkflowStepHandler - Spawns child workflow executions
 *
 * Story 2.3: Handles invoke-workflow step type
 * - Creates child workflow_executions records with parentExecutionId
 * - Applies variableMapping to expose parent variables to children
 * - Tracks child execution IDs in parent variables AND executedSteps
 * - Waits for all children to complete before advancing
 * - Aggregates child outputs into parent variable
 */
export class InvokeWorkflowStepHandler implements StepHandler {
  async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    _userInput?: unknown,
  ): Promise<StepResult> {
    const config = step.config as InvokeWorkflowStepConfig;

    console.log("[InvokeWorkflowHandler] executeStep called");
    console.log("[InvokeWorkflowHandler] config.workflowsToInvoke:", config.workflowsToInvoke);
    console.log(
      "[InvokeWorkflowHandler] context.variables:",
      JSON.stringify(context.variables, null, 2),
    );

    // Resolve workflowsToInvoke variable (array of workflow IDs)
    const workflowIds = this.resolveVariable(config.workflowsToInvoke, context) as string[];

    if (!Array.isArray(workflowIds) || workflowIds.length === 0) {
      throw new Error(
        `workflowsToInvoke must resolve to non-empty array of workflow IDs, got: ${JSON.stringify(workflowIds)}`,
      );
    }

    // Get current child_executions from variables (or initialize)
    const childExecutions = (context.variables.child_executions as string[]) || [];
    const _childMetadata =
      (context.variables._child_metadata as Array<{
        id: string;
        workflowId: string;
        workflowName: string;
        status: string;
        createdAt: string;
      }>) || [];

    // BUGFIX: If no children have been created yet, wait for user to execute them
    // (Empty array would pass .every() check, incorrectly marking step as complete)
    if (childExecutions.length === 0) {
      console.log(
        "[InvokeWorkflowHandler] No children created yet, waiting for user to execute workflows",
      );
      return {
        output: {
          child_executions: [],
          _child_metadata: [],
        },
        nextStepNumber: step.nextStepNumber ?? null,
        requiresUserInput: true, // Wait for user to click Execute buttons
      };
    }

    // Check completion condition (all children completed?)
    const allComplete = await this.checkCompletionCondition(childExecutions, config);

    if (!allComplete) {
      // Still waiting for children to complete
      return {
        output: {
          child_executions: childExecutions,
          _child_metadata: context.variables._child_metadata, // Include metadata for UI display
        },
        nextStepNumber: step.nextStepNumber ?? null,
        requiresUserInput: true, // Keep waiting
      };
    }

    // All children complete! Aggregate outputs
    const aggregatedData = await this.aggregateChildOutputs(childExecutions, config);

    // Track failed children for visibility (Story 2.3 Subtask 5.11)
    const children = await db.query.workflowExecutions.findMany({
      where: (executions, { inArray }) => inArray(executions.id, childExecutions),
      with: {
        workflow: true,
      },
    });

    const failedChildren = children
      .filter((child) => child.status === "failed")
      .map((child) => ({
        id: child.id,
        workflowId: child.workflowId,
        workflowName: child.workflow?.displayName || "Unknown",
        error: child.error || "No error message",
        failedAt: child.updatedAt?.toISOString(),
      }));

    // Store failed children info in parent variables (for UI display)
    if (failedChildren.length > 0) {
      context.variables._failed_children = failedChildren;
    }

    // Store aggregated data in parent variable
    context.variables[config.aggregateInto] = aggregatedData;

    // Step complete, advance to next step
    return {
      output: {
        child_executions: childExecutions,
        [config.aggregateInto]: aggregatedData,
        _failed_children: failedChildren, // Include in step output for time-travel
      },
      nextStepNumber: step.nextStepNumber ?? null,
      requiresUserInput: false, // Complete!
    };
  }

  /**
   * Check if completion condition is met (all children completed or failed)
   * Story 2.3 Subtask 5.11: Graceful degradation - failed children don't block parent
   */
  private async checkCompletionCondition(
    childExecutionIds: string[],
    config: InvokeWorkflowStepConfig,
  ): Promise<boolean> {
    if (config.completionCondition.type !== "all-complete") {
      throw new Error(`Unsupported completion condition: ${config.completionCondition.type}`);
    }

    // DEFENSIVE: Empty array check (should be caught earlier, but just in case)
    if (childExecutionIds.length === 0) {
      return false; // No children = not complete
    }

    // Query all child executions
    const children = await db.query.workflowExecutions.findMany({
      where: (executions, { inArray }) => inArray(executions.id, childExecutionIds),
    });

    // Graceful degradation: Consider both "completed" and "failed" as "done"
    // This allows parent to continue with partial results if some children fail
    return children.every((child) => child.status === "completed" || child.status === "failed");
  }

  /**
   * Aggregate child outputs into parent variable
   * Story 2.3 Subtask 8.2: Generic aggregation - structure preserves workflow metadata
   * Story 2.3 Subtask 5.11: Only aggregate successful children, track failures separately
   */
  private async aggregateChildOutputs(
    childExecutionIds: string[],
    config: InvokeWorkflowStepConfig,
  ): Promise<Record<string, unknown>> {
    const aggregatedData: Record<string, unknown> = {};

    // Query all child executions with workflow info
    const children = await db.query.workflowExecutions.findMany({
      where: (executions, { inArray }) => inArray(executions.id, childExecutionIds),
      with: {
        workflow: true, // Include workflow for displayName
      },
    });

    // Separate successful and failed children
    const successfulChildren = children.filter((child) => child.status === "completed");
    const failedChildren = children.filter((child) => child.status === "failed");

    // Log failures for visibility
    if (failedChildren.length > 0) {
      console.warn(
        `⚠️  ${failedChildren.length} child workflow(s) failed:`,
        failedChildren.map((c) => ({
          name: c.workflow?.displayName,
          error: c.error,
        })),
      );
    }

    // Extract expectedOutputVariable from successful children only
    // Generic structure: { workflowId: { workflowName, output, completedAt } }
    for (const child of successfulChildren) {
      const outputValue = child.variables[config.expectedOutputVariable];
      if (outputValue !== undefined && child.workflow) {
        aggregatedData[child.workflowId] = {
          workflowId: child.workflowId,
          workflowName: child.workflow.displayName,
          workflowDescription: child.workflow.description,
          output: outputValue, // Raw output from child workflow (could be anything)
          completedAt: child.completedAt?.toISOString() || new Date().toISOString(),
        };
      }
    }

    return aggregatedData;
  }

  /**
   * Resolve variable reference (e.g., "{{techniques}}" → array of IDs)
   */
  private resolveVariable(variableRef: string, context: ExecutionContext): unknown {
    // Check if it's a template variable ({{variable_name}})
    const match = variableRef.match(/^\{\{(.+?)\}\}$/);
    if (match) {
      const varName = match[1].trim();
      // Safely access variables with null check
      if (!context.variables) {
        console.warn(
          `[InvokeWorkflowHandler] context.variables is undefined when resolving ${varName}`,
        );
        return undefined;
      }
      return context.variables[varName];
    }

    // Otherwise, return as literal
    return variableRef;
  }
}
