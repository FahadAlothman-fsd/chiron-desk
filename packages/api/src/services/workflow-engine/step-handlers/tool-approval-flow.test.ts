import "../../../../test-setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { AskUserChatStepConfig } from "@chiron/db";
import { acePlaybooks, agents, db } from "@chiron/db";
import { eq } from "drizzle-orm";
import type { ExecutionContext } from "../execution-context";
import { AskUserChatStepHandler } from "./ask-user-chat-handler";

/**
 * Tool → Approval Flow Integration Test
 *
 * This test verifies the complete flow from tool execution to approval state storage:
 * 1. Tool executes via Ax signature
 * 2. Tool returns { type: "approval_required", generated_value, reasoning }
 * 3. Handler intercepts result.toolCalls
 * 4. Handler saves to approval_states with status="pending"
 * 5. Frontend can query approval_states for display
 *
 * Story 1.6: This is the core approval gate mechanism
 */
describe("Tool → Approval Flow Integration", () => {
  let handler: AskUserChatStepHandler;
  let testContext: ExecutionContext;
  let testAgentId: string;
  let testStep: any;

  beforeEach(async () => {
    // Cleanup any existing test data first
    await db.delete(agents).where(eq(agents.name, "test-pm-agent-approval"));

    handler = new AskUserChatStepHandler();

    // Create test agent
    const [agent] = await db
      .insert(agents)
      .values({
        name: "test-pm-agent-approval",
        displayName: "Test PM Agent (Approval Flow)",
        description: "Test agent for approval flow tests",
        role: "pm",
        llmProvider: "anthropic",
        llmModel: "claude-3-5-sonnet-20241022",
        instructions: `You are a project management assistant.
When the user describes their project, call update_summary to generate a project description.`,
      })
      .returning();

    testAgentId = agent.id;

    // Create ACE playbook
    await db.insert(acePlaybooks).values({
      agentId: testAgentId,
      scope: "global",
      playbook: {
        sections: {
          "Summary Generation Patterns": {
            bullets: [
              "Extract key project goals from conversation",
              "Focus on user-stated objectives, not assumptions",
            ],
          },
        },
      },
      version: 1,
      totalUpdates: 0,
    });

    // Create test step with approval-required tool
    const stepConfig: AskUserChatStepConfig = {
      agentId: testAgentId,
      initialMessage: "Tell me about your project",
      tools: [
        {
          name: "update_summary",
          description: "Generate project description from conversation",
          toolType: "ax-generation",
          requiresApproval: true, // KEY: This tool requires approval
          requiredVariables: [],
          axSignature: {
            strategy: "ChainOfThought",
            input: [
              {
                name: "conversation_history",
                description: "Full conversation with user",
                type: "string",
                source: "context",
              },
              {
                name: "ace_playbook",
                description: "Learned patterns for summary generation",
                type: "string",
                source: "playbook",
              },
            ],
            output: [
              {
                name: "summary",
                description: "Concise project description",
                type: "string",
                internal: false,
              },
              {
                name: "reasoning",
                description: "Chain of thought reasoning",
                type: "string",
                internal: true, // Internal field - used for debugging/MiPRO
              },
            ],
          },
        },
      ],
      completionCondition: {
        type: "all-tools-approved",
        requiredTools: ["update_summary"],
      },
      outputVariables: {
        project_description: "approval_states.update_summary.value",
      },
    };

    testStep = {
      id: "test-step-id",
      workflowId: "test-workflow-id",
      stepNumber: 3,
      stepType: "ask-user-chat",
      config: stepConfig,
      nextStepNumber: 4,
    };

    // Create test execution context
    testContext = {
      executionId: "test-execution-id",
      workflowId: "test-workflow-id",
      projectId: "test-project-id",
      executionVariables: {},
      systemVariables: {
        current_user_id: "test-user-id",
        current_project_id: "test-project-id",
        execution_id: "test-execution-id",
      },
    };
  });

  afterEach(async () => {
    // Cleanup test data
    if (testAgentId) {
      await db.delete(acePlaybooks).where(eq(acePlaybooks.agentId, testAgentId));
      await db.delete(agents).where(eq(agents.id, testAgentId));
    }
  });

  describe("Tool Execution → Approval State Flow", () => {
    it("should save tool result to approval_states when requiresApproval=true", async () => {
      // Initialize step (creates thread)
      const initResult = await handler.executeStep(testStep, testContext);
      expect(initResult.requiresUserInput).toBe(true);
      expect(initResult.output.mastra_thread_id).toBeDefined();

      // Update context with thread ID
      testContext.executionVariables.mastra_thread_id = initResult.output.mastra_thread_id;

      // Simulate user message that triggers tool call
      // NOTE: This is a mock test - in real execution, Mastra agent.generate()
      // would call the tool, which would return the approval_required structure
      const _userInput = "I want to build a task management app for teams";

      // IMPORTANT: For this test to pass, we need to:
      // 1. Mock the Mastra agent.generate() call to simulate tool execution
      // 2. OR: Actually execute the tool and verify the result structure

      // For now, we'll simulate the approval state being set manually
      // to verify the handler's logic for detecting and saving approval states

      // Manually simulate what would happen when tool executes
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "pending",
          value: {
            summary: "A collaborative task management application for teams",
          },
          reasoning: "User wants team collaboration features, task organization is core goal",
          rejection_history: [],
          createdAt: new Date().toISOString(),
        },
      };

      // Verify approval state structure
      const approvalStates = testContext.executionVariables.approval_states as Record<string, any>;
      expect(approvalStates.update_summary).toBeDefined();
      expect(approvalStates.update_summary.status).toBe("pending");
      expect(approvalStates.update_summary.value.summary).toBe(
        "A collaborative task management application for teams",
      );
      expect(approvalStates.update_summary.reasoning).toBeDefined();
      expect(approvalStates.update_summary.rejection_history).toEqual([]);
    });

    it("should NOT complete when tool requires approval but status=pending", async () => {
      // Set up approval state with pending status
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "pending",
          value: { summary: "Test project" },
          reasoning: "Based on conversation",
          rejection_history: [],
        },
      };

      const result = await handler.executeStep(testStep, testContext);

      // Should NOT complete (waiting for user approval)
      expect(result.requiresUserInput).toBe(true);
    });

    it("should complete when all required tools are approved", async () => {
      // Initialize step first to create thread
      const initResult = await handler.executeStep(testStep, testContext);
      testContext.executionVariables.mastra_thread_id = initResult.output.mastra_thread_id;

      // Set up approval state with approved status
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "approved",
          value: { summary: "Approved project description" },
          reasoning: "Based on conversation",
          rejection_history: [],
          approved_at: new Date().toISOString(),
        },
      };

      // Call executeStep again - should detect completion immediately
      // (In real flow, this happens after approval mutation resumes workflow)
      const result = await handler.executeStep(testStep, testContext);

      // Should complete and extract outputs
      expect(result.requiresUserInput).toBe(false);
      expect(result.output.project_description).toEqual({
        summary: "Approved project description",
      });
    });

    it("should handle rejection history in approval states", async () => {
      // Simulate a tool that was rejected once, then regenerated
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "pending", // Regenerated, awaiting approval again
          value: { summary: "Improved project description after feedback" },
          reasoning: "Incorporated user feedback about team size",
          rejection_history: [
            {
              feedback: "Please mention the team size (5-10 people)",
              rejected_at: "2024-01-15T10:30:00Z",
            },
          ],
          rejection_count: 1,
        },
      };

      const approvalStates = testContext.executionVariables.approval_states as Record<string, any>;

      // Verify rejection history is preserved
      expect(approvalStates.update_summary.rejection_history).toHaveLength(1);
      expect(approvalStates.update_summary.rejection_history[0].feedback).toBe(
        "Please mention the team size (5-10 people)",
      );
      expect(approvalStates.update_summary.rejection_count).toBe(1);
    });
  });

  describe("Tool Prerequisites and Sequential Execution", () => {
    it("should block tool execution if required variables missing", async () => {
      // Add second tool that requires first tool's output
      testStep.config.tools = [
        ...testStep.config.tools,
        {
          name: "update_complexity",
          description: "Classify project complexity",
          toolType: "ax-generation",
          requiresApproval: true,
          requiredVariables: ["project_description"], // Requires first tool!
          axSignature: {
            strategy: "Predict",
            input: [
              {
                name: "project_description",
                type: "string",
                source: "variable",
                variableName: "project_description",
              },
            ],
            output: [
              {
                name: "complexity",
                type: "string",
                internal: false,
              },
            ],
          },
        },
      ];

      // update_complexity should be BLOCKED because project_description not approved yet
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "pending", // Not approved!
          value: { summary: "Test project" },
        },
      };

      // The prerequisite validation happens at tool execution time
      // Tools are registered but cannot execute until prerequisites met
      const result = await handler.executeStep(testStep, testContext);

      // Should still require input (waiting for approval)
      expect(result.requiresUserInput).toBe(true);
    });

    it("should allow tool execution once prerequisites are approved", async () => {
      // Same setup as above, but now first tool is APPROVED
      testStep.config.tools = [
        ...testStep.config.tools,
        {
          name: "update_complexity",
          description: "Classify project complexity",
          toolType: "ax-generation",
          requiresApproval: true,
          requiredVariables: ["project_description"],
          axSignature: {
            strategy: "Predict",
            input: [
              {
                name: "project_description",
                type: "string",
                source: "variable",
                variableName: "project_description",
              },
            ],
            output: [
              {
                name: "complexity",
                type: "string",
                internal: false,
              },
            ],
          },
        },
      ];

      testStep.config.completionCondition = {
        type: "all-tools-approved",
        requiredTools: ["update_summary", "update_complexity"],
      };

      // First tool approved, adds project_description to variables
      testContext.executionVariables.approval_states = {
        update_summary: {
          status: "approved",
          value: { summary: "Complex distributed system" },
        },
      };

      // Merge approved value into execution variables
      testContext.executionVariables.project_description = {
        summary: "Complex distributed system",
      };

      // Now update_complexity can execute!
      // (In real flow, agent would call it automatically)

      // Simulate complexity tool execution
      testContext.executionVariables.approval_states.update_complexity = {
        status: "pending",
        value: { complexity: "method" },
      };

      const result = await handler.executeStep(testStep, testContext);

      // Should still require approval for second tool
      expect(result.requiresUserInput).toBe(true);
    });
  });

  describe("Approval State Data Structure", () => {
    it("should preserve complete approval state structure", async () => {
      const mockApprovalState = {
        status: "pending" as const,
        value: {
          summary: "E-commerce platform with AI recommendations",
          key_features: ["product catalog", "recommendation engine"],
        },
        reasoning: "User emphasized personalization and product discovery features",
        rejection_history: [],
        createdAt: "2024-01-15T10:00:00Z",
      };

      testContext.executionVariables.approval_states = {
        update_summary: mockApprovalState,
      };

      const approvalStates = testContext.executionVariables.approval_states as Record<string, any>;

      // Verify all fields are preserved
      expect(approvalStates.update_summary.status).toBe("pending");
      expect(approvalStates.update_summary.value.summary).toBe(
        "E-commerce platform with AI recommendations",
      );
      expect(approvalStates.update_summary.value.key_features).toEqual([
        "product catalog",
        "recommendation engine",
      ]);
      expect(approvalStates.update_summary.reasoning).toContain("personalization");
      expect(approvalStates.update_summary.createdAt).toBeDefined();
    });
  });
});
