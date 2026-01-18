import { db, workflowExecutions, workflowPathWorkflows, workflows } from "@chiron/db";
import { observable } from "@trpc/server/observable";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { continueExecution, executeWorkflow } from "../services/workflow-engine/effect/executor";
import { type WorkflowEvent, workflowEventBus } from "../services/workflow-engine/event-bus";
import { stateManager } from "../services/workflow-engine/state-manager";

/**
 * Workflow Router - tRPC endpoints for workflow execution
 */

export const workflowRouter = router({
  /**
   * Start a new workflow execution
   */
  execute: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const executionId = await executeWorkflow({
        workflowId: input.workflowId,
        userId: userId,
        projectId: input.projectId,
      });

      return { executionId };
    }),

  /**
   * Story 1.5: Continue an existing execution (for execute-action steps)
   * Use this instead of execute() when an execution already exists
   */
  continue: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await continueExecution(input.executionId, userId);
      return { success: true };
    }),

  /**
   * Submit user input for a step (resume paused workflow)
   */
  submitStep: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        userInput: z.any(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Resume execution with user input
      await stateManager.resumeExecution(input.executionId);
      await continueExecution(input.executionId, userId, input.userInput);

      return { success: true };
    }),

  /**
   * Get execution state
   */
  getExecution: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const execution = await stateManager.getExecution(input.executionId);

      if (!execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      return execution;
    }),

  /**
   * Story 2.1: Get execution state by project ID
   * Finds the active/paused execution for a project (used by initialize page)
   */
  getExecutionByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      // Query workflow_executions by project_id, get the most recent non-completed
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.projectId, input.projectId))
        .orderBy(sql`${workflowExecutions.startedAt} DESC`)
        .limit(1);

      if (!execution) {
        return null;
      }

      // Build the same response structure as getExecution
      const fullExecution = await stateManager.getExecution(execution.id);
      return fullExecution;
    }),

  /**
   * Get ALL executions for a project
   * Returns executions with workflow metadata, ordered by most recent first
   * Used by project dashboard and executions list page
   */
  getExecutionsByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        includeChildren: z.boolean().optional().default(false), // Whether to include child workflow executions
      }),
    )
    .query(async ({ input }) => {
      // Query all executions for this project with workflow info
      const query = db
        .select({
          execution: workflowExecutions,
          workflow: workflows,
        })
        .from(workflowExecutions)
        .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
        .where(eq(workflowExecutions.projectId, input.projectId))
        .orderBy(sql`${workflowExecutions.startedAt} DESC`);

      const results = await query;

      // Filter out child executions if not requested
      const filteredResults = input.includeChildren
        ? results
        : results.filter((r) => !r.execution.parentExecutionId);

      return {
        executions: filteredResults.map((r) => ({
          id: r.execution.id,
          workflowId: r.execution.workflowId,
          workflowName: r.workflow.displayName || r.workflow.name,
          workflowDescription: r.workflow.description,
          status: r.execution.status,
          currentStep: r.execution.currentStepId,
          startedAt: r.execution.startedAt?.toISOString(),
          completedAt: r.execution.completedAt?.toISOString(),
          parentExecutionId: r.execution.parentExecutionId,
          // Include workflow metadata for phase info
          workflowTags: r.workflow.tags,
          workflowMetadata: r.workflow.metadata,
        })),
      };
    }),

  /**
   * Pause a running workflow
   */
  pauseWorkflow: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await stateManager.pauseExecution(input.executionId);
      workflowEventBus.emitWorkflowPaused(input.executionId);

      return { success: true };
    }),

  /**
   * Resume a paused workflow
   */
  resumeWorkflow: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      await stateManager.resumeExecution(input.executionId);
      workflowEventBus.emitWorkflowResumed(input.executionId);
      await continueExecution(input.executionId, userId);

      return { success: true };
    }),

  /**
   * Subscribe to workflow events (SSE subscription)
   * Frontend receives real-time updates for workflow lifecycle
   */
  onWorkflowEvent: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .subscription(({ input }) => {
      return observable<WorkflowEvent>((emit) => {
        // Subscribe to events for this execution
        const unsubscribe = workflowEventBus.subscribeToExecution(input.executionId, (event) => {
          emit.next(event);
        });

        // Return cleanup function
        return () => {
          unsubscribe();
        };
      });
    }),

  /**
   * Story 1.5: Get workflow initializers
   * Returns workflows that can be used to initialize a new project
   * Story 2.1: Updated to use tags JSONB field instead of initializerType column
   */
  getInitializers: protectedProcedure
    .input(
      z.object({
        type: z.enum(["new-project", "existing-project"]),
      }),
    )
    .query(async ({ input }) => {
      // Query using JSONB tags field: tags->>'type' = 'initializer' AND tags->>'track' = input.type
      const initializers = await db.query.workflows.findMany({
        where: (workflows, { sql }) =>
          sql`${workflows.tags}->>'type' = 'initializer' AND ${workflows.tags}->>'track' = ${input.type === "new-project" ? "greenfield" : "brownfield"}`,
        orderBy: (workflows, { asc }) => [asc(workflows.displayName)],
      });

      return { workflows: initializers };
    }),

  /**
   * Story 2.1: Get workflows by phase
   * Returns workflows filtered by phase tag (e.g., "0" for Discovery)
   */
  getByPhase: protectedProcedure
    .input(
      z.object({
        phase: z.string(), // e.g., "0", "1", "2", etc.
      }),
    )
    .query(async ({ input }) => {
      // Query using JSONB tags field: tags->>'phase' = input.phase
      const workflowResults = await db.query.workflows.findMany({
        where: (workflows, { sql }) => sql`${workflows.tags}->>'phase' = ${input.phase}`,
        orderBy: (workflows, { asc }) => [asc(workflows.displayName)],
      });

      return { workflows: workflowResults };
    }),

  /**
   * Story 2.1: Get workflows by phase AND workflow path
   * Returns workflows that belong to a specific workflow path for a given phase
   * Uses the workflow_path_workflows junction table for filtering
   */
  getByPhaseAndPath: protectedProcedure
    .input(
      z.object({
        phase: z.string(), // e.g., "0", "1", "2", etc.
        workflowPathId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      // Convert phase string to integer for junction table query
      const phaseNum = Number.parseInt(input.phase, 10);

      // Query workflows via the junction table
      const results = await db
        .select({
          workflow: workflows,
          sequenceOrder: workflowPathWorkflows.sequenceOrder,
          isOptional: workflowPathWorkflows.isOptional,
          isRecommended: workflowPathWorkflows.isRecommended,
        })
        .from(workflowPathWorkflows)
        .innerJoin(workflows, eq(workflowPathWorkflows.workflowId, workflows.id))
        .where(
          and(
            eq(workflowPathWorkflows.workflowPathId, input.workflowPathId),
            eq(workflowPathWorkflows.phase, phaseNum),
          ),
        )
        .orderBy(workflowPathWorkflows.sequenceOrder);

      // Map to return workflow objects with additional path metadata
      return {
        workflows: results.map((r) => ({
          ...r.workflow,
          sequenceOrder: r.sequenceOrder,
          isOptional: r.isOptional,
          isRecommended: r.isRecommended,
        })),
      };
    }),

  /**
   * Get next recommended workflow for a project based on workflow path
   * Returns the first workflow in the path that hasn't been completed
   * Also returns active/paused execution if one exists for the recommended workflow
   */
  getNextRecommendedWorkflow: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        workflowPathId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      // 1. Get all workflows in the path, ordered by phase then sequence
      const pathWorkflows = await db
        .select({
          workflow: workflows,
          phase: workflowPathWorkflows.phase,
          sequenceOrder: workflowPathWorkflows.sequenceOrder,
          isOptional: workflowPathWorkflows.isOptional,
          isRecommended: workflowPathWorkflows.isRecommended,
        })
        .from(workflowPathWorkflows)
        .innerJoin(workflows, eq(workflowPathWorkflows.workflowId, workflows.id))
        .where(eq(workflowPathWorkflows.workflowPathId, input.workflowPathId))
        .orderBy(workflowPathWorkflows.phase, workflowPathWorkflows.sequenceOrder);

      if (pathWorkflows.length === 0) {
        return { nextWorkflow: null, activeExecution: null, currentPhase: 0 };
      }

      // 2. Get all executions for this project (excluding child executions)
      const projectExecutions = await db
        .select()
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.projectId, input.projectId),
            sql`${workflowExecutions.parentExecutionId} IS NULL`,
          ),
        );

      // 3. Create a map of workflowId -> execution status
      const executionsByWorkflow = new Map<string, { status: string; id: string }>();
      for (const exec of projectExecutions) {
        const existing = executionsByWorkflow.get(exec.workflowId);
        // Prefer active/paused executions over completed ones
        if (!existing || exec.status === "active" || exec.status === "paused") {
          executionsByWorkflow.set(exec.workflowId, {
            status: exec.status,
            id: exec.id,
          });
        }
      }

      // 4. Find the first workflow that:
      //    - Has no execution, OR
      //    - Has an active/paused execution (user should continue it)
      let nextWorkflow = null;
      let activeExecution = null;
      let currentPhase = 0;

      for (const pw of pathWorkflows) {
        const execution = executionsByWorkflow.get(pw.workflow.id);

        if (!execution) {
          // No execution exists - this is the next one to start
          nextWorkflow = {
            ...pw.workflow,
            phase: pw.phase,
            sequenceOrder: pw.sequenceOrder,
            isOptional: pw.isOptional,
            isRecommended: pw.isRecommended,
          };
          currentPhase = pw.phase;
          break;
        }

        if (execution.status === "active" || execution.status === "paused") {
          // Active/paused execution - user should continue this
          nextWorkflow = {
            ...pw.workflow,
            phase: pw.phase,
            sequenceOrder: pw.sequenceOrder,
            isOptional: pw.isOptional,
            isRecommended: pw.isRecommended,
          };
          activeExecution = { id: execution.id, status: execution.status };
          currentPhase = pw.phase;
          break;
        }

        // Execution is completed - update current phase and continue to next workflow
        currentPhase = pw.phase;
      }

      // 5. If all workflows completed, return null with current phase
      if (!nextWorkflow && pathWorkflows.length > 0) {
        currentPhase = pathWorkflows[pathWorkflows.length - 1].phase;
      }

      return {
        nextWorkflow,
        activeExecution,
        currentPhase,
        totalWorkflowsInPath: pathWorkflows.length,
        completedCount: projectExecutions.filter((e) => e.status === "completed").length,
      };
    }),

  /**
   * Story 1.5: Get workflow by ID
   * Returns a single workflow by its ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const workflow = await db.query.workflows.findFirst({
        where: (workflows, { eq }) => eq(workflows.id, input.id),
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${input.id}`);
      }

      return workflow;
    }),

  /**
   * Get all steps for a workflow
   * Returns steps sorted by stepNumber
   */
  getSteps: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const steps = await db.query.workflowSteps.findMany({
        where: (workflowSteps, { eq }) => eq(workflowSteps.workflowId, input.workflowId),
        orderBy: (workflowSteps, { asc }) => [asc(workflowSteps.stepNumber)],
      });

      return { steps };
    }),

  /**
   * Story 1.6: Approve a tool call result
   * Saves the approved value, stores to MiPRO training, and resumes workflow
   */
  approveToolCall: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        toolName: z.string(),
        approvedValue: z.any(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      // Get execution
      const executionData = await stateManager.getExecution(input.executionId);
      if (!executionData || !executionData.execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      const { execution, currentStep } = executionData;

      // Validate execution is paused
      if (execution.status !== "paused") {
        throw new Error(`Cannot approve: Execution is ${execution.status}, expected "paused"`);
      }

      // Get approval states from variables
      const approvalStates = (execution.variables.approval_states || {}) as Record<string, any>;
      const toolState = approvalStates[input.toolName];

      if (!toolState) {
        throw new Error(`Tool "${input.toolName}" not found in approval states`);
      }

      // Update approval state
      toolState.status = "approved";
      toolState.value = input.approvedValue;
      toolState.approved_at = new Date().toISOString();

      // Clear regenerationNeeded flag to prevent re-triggering rejection flow
      toolState.regenerationNeeded = false;

      // Compute derived values from extractFrom configs
      // These are variables that depend on the approved value
      const stepConfig = currentStep?.config as any;
      const tools = stepConfig?.tools || [];

      console.log("[ApproveToolCall] DEBUG - Looking for tool config:", {
        hasStepConfig: !!stepConfig,
        hasTools: !!tools,
        toolsCount: tools.length,
        toolNames: tools.map((t: any) => t.name),
        lookingFor: input.toolName,
      });

      const toolConfig = tools.find((t: any) => t.name === input.toolName);

      if (toolConfig?.axSignature?.output) {
        const derivedValues: Record<string, unknown> = {};

        // Check each output for extractFrom config
        for (const output of toolConfig.axSignature.output) {
          const outputAny = output as any;
          if (!outputAny.extractFrom) continue;

          const { source, matchField, matchValue, selectField } = outputAny.extractFrom;

          // Get the match value from approved value
          const matchValueData = input.approvedValue[matchValue];
          if (!matchValueData) {
            console.warn(
              `[ApproveToolCall] extractFrom: matchValue field '${matchValue}' not found in approved value for '${output.name}'`,
            );
            continue;
          }

          // Get source data from execution variables
          const sourceData = execution.variables[source];
          if (!sourceData || !Array.isArray(sourceData)) {
            console.warn(
              `[ApproveToolCall] extractFrom: source '${source}' not found or not an array for '${output.name}'`,
            );
            continue;
          }

          // Find matching option
          const matchedOption = sourceData.find((item: any) => item[matchField] === matchValueData);

          if (!matchedOption) {
            console.warn(
              `[ApproveToolCall] extractFrom: no option found matching ${matchField}='${matchValueData}' in '${source}' for '${output.name}'`,
            );
            continue;
          }

          // Extract the desired field
          const extractedValue = matchedOption[selectField];
          if (extractedValue === undefined) {
            console.warn(
              `[ApproveToolCall] extractFrom: field '${selectField}' not found in matched option for '${output.name}'`,
            );
            continue;
          }

          // Store in derived values
          derivedValues[output.name] = extractedValue;
          console.log(
            `[ApproveToolCall] extractFrom: Extracted '${output.name}' = '${extractedValue}' (matched ${matchField}='${matchValueData}' in ${source})`,
          );
        }

        // Save derived values to approval state if any were extracted
        if (Object.keys(derivedValues).length > 0) {
          toolState.derived_values = derivedValues;
          console.log(
            "[ApproveToolCall] Stored derived values:",
            JSON.stringify(derivedValues, null, 2),
          );
        }
      }

      // Extract output fields from approved value and merge into execution variables
      // This allows subsequent tools to access these variables as prerequisites

      console.log("[ApproveToolCall] Tool config check:", {
        toolName: input.toolName,
        toolType: toolConfig?.toolType,
        hasTargetVariable: !!toolConfig?.targetVariable,
        targetVariable: toolConfig?.targetVariable,
        approvedValueType: typeof input.approvedValue,
      });

      if (toolConfig?.toolType === "update-variable" && toolConfig?.targetVariable) {
        // For update-variable tools, save the value directly to targetVariable
        execution.variables[toolConfig.targetVariable] = input.approvedValue;
        console.log(
          `[ApproveToolCall] Saved update-variable: ${toolConfig.targetVariable} = ${typeof input.approvedValue === "string" ? `${input.approvedValue.substring(0, 50)}...` : JSON.stringify(input.approvedValue)}`,
        );
      } else if (input.approvedValue && typeof input.approvedValue === "object") {
        // For other tools (AX generation, etc.), merge all non-internal fields from approved value
        for (const [key, value] of Object.entries(input.approvedValue)) {
          // Skip internal fields (reasoning, etc.) - only extract actual outputs
          if (key !== "reasoning" && key !== "internal") {
            execution.variables[key] = value;
            console.log(
              `[ApproveToolCall] Extracted output variable: ${key} = ${typeof value === "string" ? `${value.substring(0, 50)}...` : JSON.stringify(value)}`,
            );
          }
        }

        // Also merge derived values into execution variables
        if (toolState.derived_values) {
          for (const [key, value] of Object.entries(toolState.derived_values)) {
            execution.variables[key] = value;
            console.log(
              `[ApproveToolCall] Extracted derived variable: ${key} = ${typeof value === "string" ? `${value.substring(0, 50)}...` : JSON.stringify(value)}`,
            );
          }
        }
      }

      // Update execution variables
      await db
        .update(workflowExecutions)
        .set({
          variables: execution.variables,
          status: "active",
        })
        .where(eq(workflowExecutions.id, input.executionId));

      // Emit event
      workflowEventBus.emitWorkflowResumed(input.executionId);

      // Resume workflow execution
      await continueExecution(input.executionId, userId);

      console.log(`[WorkflowRouter] Approved tool: ${input.toolName}`);

      return { success: true };
    }),

  /**
   * Story 1.6: Reject a tool call result with feedback
   * Updates ACE playbook with feedback and regenerates
   */
  rejectToolCall: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        toolName: z.string(),
        feedback: z.string(),
        agentId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      // Get execution
      const executionData = await stateManager.getExecution(input.executionId);
      if (!executionData || !executionData.execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      const { execution } = executionData;

      // Validate execution is paused
      if (execution.status !== "paused") {
        throw new Error(`Cannot reject: Execution is ${execution.status}, expected "paused"`);
      }

      // Get approval states from variables
      const approvalStates = (execution.variables.approval_states || {}) as Record<string, any>;
      const toolState = approvalStates[input.toolName];

      if (!toolState) {
        throw new Error(`Tool "${input.toolName}" not found in approval states`);
      }

      // Check for duplicate rejection (prevent double-clicking)
      const lastRejection = toolState.rejection_history?.[toolState.rejection_history.length - 1];
      if (
        lastRejection &&
        lastRejection.feedback === input.feedback &&
        Date.now() - new Date(lastRejection.rejectedAt).getTime() < 2000
      ) {
        console.log("[RejectToolCall] Duplicate rejection detected, ignoring");
        return { success: true, duplicate: true };
      }

      // Save previous output to rejection history
      const rejectionEntry = {
        feedback: input.feedback,
        rejectedAt: new Date().toISOString(),
        previousOutput: toolState.value,
      };

      toolState.rejection_history = toolState.rejection_history || [];
      toolState.rejection_history.push(rejectionEntry);

      // Mark as rejected (final state for this card - timeline approach)
      toolState.status = "rejected";

      // Update approval states
      const updatedVariables = {
        ...execution.variables,
        approval_states: approvalStates,
      };

      await stateManager.mergeExecutionVariables(input.executionId, updatedVariables);

      console.log(`[WorkflowRouter] Rejected tool: ${input.toolName}, feedback: ${input.feedback}`);

      // Resume workflow for regeneration
      // Handler will detect rejected tools from approval_states and process regeneration
      await stateManager.resumeExecution(input.executionId);
      await continueExecution(input.executionId, userId, input.feedback);

      workflowEventBus.emitWorkflowResumed(input.executionId);

      return { success: true };
    }),

  getChatMessages: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        stepNumber: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const executionData = await stateManager.getExecution(input.executionId);
      if (!executionData || !executionData.execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }
      return { messages: [] };
    }),

  /**
   * Story 1.6: Send chat message to AI agent
   * Convenience alias for submitStep with model selection support
   */

  /**
   * Story 1.6: Send chat message and get agent response
   * This submits user input to the step handler which processes via Mastra agent
   */
  sendChatMessage: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        message: z.string(),
        selectedModel: z.string().optional(), // User's model selection from UI
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get userId from authenticated session
      const userId = ctx.session.user.id;

      // If user selected a model, store it in execution variables
      if (input.selectedModel) {
        await stateManager.mergeExecutionVariables(input.executionId, {
          selected_model: input.selectedModel,
        });
      }

      // Submit the message as user input to continue execution
      await stateManager.resumeExecution(input.executionId);
      await continueExecution(input.executionId, userId, input.message);

      workflowEventBus.emitWorkflowResumed(input.executionId);

      return { success: true };
    }),

  /**
   * Story 1.6: Approve tool output
   * User accepts AI-generated output from approval gate
   *
   * This mutation:
   * 1. Updates approval state to "approved"
   * 2. Saves approved value to execution variables
   * 3. Saves to MiPRO training examples for future optimization
   * 4. Resumes workflow execution
   */
  approveToolOutput: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        toolName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Get execution to access approval states
      const executionData = await stateManager.getExecution(input.executionId);
      if (!executionData || !executionData.execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      const { execution } = executionData;

      const approvalStates = (execution.variables.approval_states || {}) as Record<string, any>;
      const toolState = approvalStates[input.toolName];

      if (!toolState) {
        throw new Error(`No approval state found for tool: ${input.toolName}`);
      }

      if (toolState.status === "approved") {
        // Already approved, just return success
        return { success: true, alreadyApproved: true };
      }

      // Update approval state to approved
      toolState.status = "approved";
      toolState.approvedAt = new Date().toISOString();

      // Compute derived values from extractFrom configs
      // These are variables that depend on the approved value
      const stepConfig = execution.currentStep?.config as any;
      const tools = stepConfig?.tools || [];
      const toolConfig = tools.find((t: any) => t.name === input.toolName);

      if (toolConfig?.axSignature?.output) {
        const derivedValues: Record<string, unknown> = {};

        // Check each output for extractFrom config
        for (const output of toolConfig.axSignature.output) {
          const outputAny = output as any;
          if (!outputAny.extractFrom) continue;

          const { source, matchField, matchValue, selectField } = outputAny.extractFrom;

          // Get the match value from toolState.value
          const matchValueData = toolState.value[matchValue];
          if (!matchValueData) {
            console.warn(
              `[ApproveToolOutput] extractFrom: matchValue field '${matchValue}' not found in tool value for '${output.name}'`,
            );
            continue;
          }

          // Get source data from execution variables
          const sourceData = execution.variables[source];
          if (!sourceData || !Array.isArray(sourceData)) {
            console.warn(
              `[ApproveToolOutput] extractFrom: source '${source}' not found or not an array for '${output.name}'`,
            );
            continue;
          }

          // Find matching option
          const matchedOption = sourceData.find((item: any) => item[matchField] === matchValueData);

          if (!matchedOption) {
            console.warn(
              `[ApproveToolOutput] extractFrom: no option found matching ${matchField}='${matchValueData}' in '${source}' for '${output.name}'`,
            );
            continue;
          }

          // Extract the desired field
          const extractedValue = matchedOption[selectField];
          if (extractedValue === undefined) {
            console.warn(
              `[ApproveToolOutput] extractFrom: field '${selectField}' not found in matched option for '${output.name}'`,
            );
            continue;
          }

          // Store in derived values
          derivedValues[output.name] = extractedValue;
          console.log(
            `[ApproveToolOutput] extractFrom: Extracted '${output.name}' = '${extractedValue}' (matched ${matchField}='${matchValueData}' in ${source})`,
          );
        }

        // Save derived values to approval state if any were extracted
        if (Object.keys(derivedValues).length > 0) {
          toolState.derived_values = derivedValues;
          console.log(
            "[ApproveToolOutput] Stored derived values:",
            JSON.stringify(derivedValues, null, 2),
          );
        }
      }

      // Save approved value to execution variables
      const approvedValue = toolState.value;

      // For update-variable tools, save value directly to targetVariable
      // For other tools (AX generation, etc.), merge all fields from approved value
      const variablesToMerge: Record<string, unknown> = {};

      if (toolConfig?.toolType === "update-variable" && toolConfig?.targetVariable) {
        // For update-variable tools, save the value directly to targetVariable
        variablesToMerge[toolConfig.targetVariable] = approvedValue;
        console.log(
          `[ApproveToolOutput] Saved update-variable: ${toolConfig.targetVariable} = ${typeof approvedValue === "string" ? `${approvedValue.substring(0, 50)}...` : JSON.stringify(approvedValue)}`,
        );
      } else if (approvedValue && typeof approvedValue === "object") {
        // For other tools (AX generation, etc.), merge all non-internal fields from approved value
        for (const [key, value] of Object.entries(approvedValue)) {
          // Skip internal fields (reasoning, etc.) - only extract actual outputs
          if (key !== "reasoning" && key !== "internal") {
            variablesToMerge[key] = value;
            console.log(
              `[ApproveToolOutput] Extracted output variable: ${key} = ${typeof value === "string" ? `${value.substring(0, 50)}...` : JSON.stringify(value)}`,
            );
          }
        }
      }

      const updatedVariables = {
        ...execution.variables,
        approval_states: approvalStates,
        ...variablesToMerge, // Merge extracted/target variables
        ...toolState.derived_values, // Also merge derived values
      };

      await stateManager.mergeExecutionVariables(input.executionId, updatedVariables);

      // Resume workflow execution
      await stateManager.resumeExecution(input.executionId);
      await continueExecution(input.executionId, userId, "");

      workflowEventBus.emitWorkflowResumed(input.executionId);

      return { success: true };
    }),

  /**
   * Story 1.6: Reject tool output
   * User rejects AI-generated output and provides feedback
   *
   * This mutation:
   * 1. Updates approval state to "rejected"
   * 2. Saves rejection feedback to history
   * 3. Triggers ACE optimizer to update playbook
   * 4. Regenerates output with updated ACE knowledge
   */
  rejectToolOutput: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        toolName: z.string(),
        feedback: z.string().min(1, "Feedback is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Get execution to access approval states
      const executionData = await stateManager.getExecution(input.executionId);
      if (!executionData || !executionData.execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      const { execution } = executionData;

      const approvalStates = (execution.variables.approval_states || {}) as Record<string, any>;
      const toolState = approvalStates[input.toolName];

      if (!toolState) {
        throw new Error(`No approval state found for tool: ${input.toolName}`);
      }

      // Check for duplicate rejection (prevent double-clicking)
      const lastRejection = toolState.rejection_history?.[toolState.rejection_history.length - 1];
      if (
        lastRejection &&
        lastRejection.feedback === input.feedback &&
        Date.now() - new Date(lastRejection.rejectedAt).getTime() < 2000
      ) {
        console.log("[RejectToolOutput] Duplicate rejection detected, ignoring");
        return { success: true, duplicate: true };
      }

      // Save previous output to rejection history
      const rejectionEntry = {
        feedback: input.feedback,
        rejectedAt: new Date().toISOString(),
        previousOutput: toolState.value,
      };

      toolState.rejection_history = toolState.rejection_history || [];
      toolState.rejection_history.push(rejectionEntry);

      // Mark as rejected (final state for this card)
      toolState.status = "rejected";

      // Update approval states
      const updatedVariables = {
        ...execution.variables,
        approval_states: approvalStates,
      };

      await stateManager.mergeExecutionVariables(input.executionId, updatedVariables);

      // Resume workflow for regeneration
      // Handler will detect rejected tools from approval_states and process regeneration
      await stateManager.resumeExecution(input.executionId);
      await continueExecution(input.executionId, userId, input.feedback);

      workflowEventBus.emitWorkflowResumed(input.executionId);

      return { success: true, regenerationTriggered: true };
    }),

  /**
   * Get workflows by IDs
   * Used by invoke-workflow step to display workflow names
   * Includes step count for progress visualization
   */
  getByIds: protectedProcedure
    .input(
      z.object({
        workflowIds: z.array(z.string().uuid()),
      }),
    )
    .query(async ({ input }) => {
      const workflows = await db.query.workflows.findMany({
        where: (workflows, { inArray }) => inArray(workflows.id, input.workflowIds),
        with: {
          steps: true, // Include steps for count
        },
      });

      return workflows.map((w) => ({
        id: w.id,
        name: w.name,
        displayName: w.displayName,
        description: w.description,
        metadata: w.metadata,
        stepCount: w.steps?.length ?? 0,
      }));
    }),

  /**
   * Get executions by IDs
   * Used by invoke-workflow step to poll child execution status
   * Returns step progress and tool progress for running workflows
   */
  getExecutionsByIds: protectedProcedure
    .input(
      z.object({
        executionIds: z.array(z.string().uuid()),
      }),
    )
    .query(async ({ input }) => {
      if (input.executionIds.length === 0) {
        return [];
      }

      const executions = await db.query.workflowExecutions.findMany({
        where: (executions, { inArray }) => inArray(executions.id, input.executionIds),
        with: {
          workflow: {
            with: {
              steps: true, // Include steps to get total count
            },
          },
        },
      });

      return executions.map((e) => {
        // Calculate step progress
        const steps = e.workflow?.steps || [];
        const totalSteps = steps.length;
        const executedSteps = (e.executedSteps as Record<string, { status: string }>) || {};
        const completedStepCount = Object.values(executedSteps).filter(
          (s) => s.status === "completed",
        ).length;

        // Find current step number from executedSteps (the one that's "waiting")
        const waitingStepNum = Object.entries(executedSteps).find(
          ([_, s]) => s.status === "waiting",
        )?.[0];
        const currentStepNumber = waitingStepNum
          ? Number.parseInt(waitingStepNum, 10)
          : completedStepCount + 1;

        // Get current step config to find total tools
        const currentStep = steps.find((s) => s.stepNumber === currentStepNumber);
        const stepConfig = currentStep?.config as {
          tools?: Array<{ name: string; requiresApproval?: boolean }>;
        } | null;

        // Count tools that require approval (these are the ones shown in approval_states)
        const configuredTools =
          stepConfig?.tools?.filter((t) => t.requiresApproval !== false) || [];
        const totalTools = configuredTools.length;

        // Calculate approved tools from approval_states
        const variables = (e.variables as Record<string, unknown>) || {};
        const approvalStates = (variables.approval_states || {}) as Record<
          string,
          { status: string }
        >;
        const approvedToolCount = Object.values(approvalStates).filter(
          (s) => s.status === "approved",
        ).length;

        return {
          id: e.id,
          status: e.status,
          workflowId: e.workflowId,
          workflowName: e.workflow?.displayName || e.workflow?.name || "Unknown",
          variables: e.variables,
          error: e.error,
          completedAt: e.completedAt?.toISOString(),
          // Step progress
          stepProgress: {
            current: currentStepNumber,
            total: totalSteps,
            completed: completedStepCount,
          },
          // Tool progress within current step
          toolProgress:
            totalTools > 0
              ? {
                  approved: approvedToolCount,
                  total: totalTools,
                }
              : null,
        };
      });
    }),

  /**
   * Get detailed execution info for expanded card view
   * Returns step details with tool statuses for the WorkflowExecutionCard component
   */
  getExecutionDetails: protectedProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      // Get execution with workflow and steps
      const execution = await db.query.workflowExecutions.findFirst({
        where: (executions, { eq }) => eq(executions.id, input.executionId),
        with: {
          workflow: {
            with: {
              steps: {
                orderBy: (steps, { asc }) => [asc(steps.stepNumber)],
              },
            },
          },
        },
      });

      if (!execution) {
        throw new Error(`Execution not found: ${input.executionId}`);
      }

      const workflowSteps = execution.workflow?.steps ?? [];
      const executedSteps =
        (execution.executedSteps as Record<string, { status: string; error?: string }>) || {};
      const variables = (execution.variables as Record<string, unknown>) || {};
      const approvalStates = (variables.approval_states || {}) as Record<
        string,
        { status: string }
      >;

      // Build step details
      const steps = workflowSteps.map((step) => {
        const executedStep = executedSteps[step.stepNumber.toString()];
        const stepConfig = step.config as {
          tools?: Array<{ name: string; requiresApproval?: boolean }>;
        } | null;

        // Determine step status
        let stepStatus: "completed" | "waiting" | "failed" | "pending" = "pending";
        if (executedStep) {
          if (executedStep.status === "completed") stepStatus = "completed";
          else if (executedStep.status === "waiting") stepStatus = "waiting";
          else if (executedStep.status === "failed") stepStatus = "failed";
        }

        // Get tools with their approval status
        const configuredTools = stepConfig?.tools ?? [];
        const tools = configuredTools.map((tool) => {
          const approval = approvalStates[tool.name];
          let toolStatus: "approved" | "rejected" | "pending" = "pending";
          if (approval) {
            if (approval.status === "approved") toolStatus = "approved";
            else if (approval.status === "rejected") toolStatus = "rejected";
          }
          return {
            name: tool.name,
            status: toolStatus,
          };
        });

        return {
          stepNumber: step.stepNumber,
          stepId: step.id,
          name: step.goal, // Use goal as the step name/title
          status: stepStatus,
          tools,
        };
      });

      return {
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt?.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        error: execution.error,
        steps,
      };
    }),

  /**
   * Get workflow template by ID
   */
  getTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const template = await db.query.workflowTemplates.findFirst({
        where: (templates, { eq }) => eq(templates.id, input.templateId),
      });

      if (!template) {
        throw new Error(`Template not found: ${input.templateId}`);
      }

      return template;
    }),

  /**
   * Create and start a child workflow execution
   * Used by invoke-workflow steps to create child workflows on-demand
   */
  createAndStartChild: protectedProcedure
    .input(
      z.object({
        parentExecutionId: z.string().uuid(),
        workflowId: z.string().uuid(),
        projectId: z.string().uuid(),
        mappedVariables: z.record(z.string(), z.any()).optional(), // Variables to pass from parent to child
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // Get parent execution to inherit model selection
      const parentExecution = await stateManager.getExecution(input.parentExecutionId);
      if (!parentExecution) {
        throw new Error(`Parent execution not found: ${input.parentExecutionId}`);
      }

      // Inherit model selection from parent
      const selectedModel = parentExecution.execution.variables.selected_model as
        | string
        | undefined;

      // Combine model selection and mapped variables
      const initialVariables: Record<string, unknown> = {
        ...input.mappedVariables,
        ...(selectedModel ? { selected_model: selectedModel } : {}),
      };

      // Create and start the child workflow execution with inherited model, mapped variables, and parent link
      const childExecutionId = await executeWorkflow({
        workflowId: input.workflowId,
        userId,
        projectId: input.projectId,
        initialVariables,
        parentExecutionId: input.parentExecutionId,
      });

      // Get child execution with workflow details
      const childExecution = await db.query.workflowExecutions.findFirst({
        where: eq(workflowExecutions.id, childExecutionId),
        with: {
          workflow: true,
        },
      });

      if (!childExecution) {
        throw new Error("Failed to create child execution");
      }

      // Update parent's _child_metadata to track this child
      const currentChildMetadata = (parentExecution.execution.variables._child_metadata ||
        []) as Array<{
        id: string;
        workflowId: string;
        workflowName: string;
        status: string;
        createdAt: string;
      }>;

      await stateManager.mergeExecutionVariables(input.parentExecutionId, {
        _child_metadata: [
          ...currentChildMetadata,
          {
            id: childExecution.id,
            workflowId: childExecution.workflowId,
            workflowName: childExecution.workflow.displayName || childExecution.workflow.name,
            status: childExecution.status,
            createdAt: childExecution.createdAt.toISOString(),
          },
        ],
      });

      console.log(
        `[CreateAndStartChild] Updated parent ${input.parentExecutionId} with child metadata for ${childExecution.id}`,
      );

      // Return child metadata
      return {
        id: childExecution.id,
        workflowId: childExecution.workflowId,
        workflowName: childExecution.workflow.displayName || childExecution.workflow.name,
        status: childExecution.status,
        createdAt: childExecution.createdAt.toISOString(),
      };
    }),
}) as ReturnType<typeof router>;
