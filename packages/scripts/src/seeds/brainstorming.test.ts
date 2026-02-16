import { describe, expect, it } from "bun:test";
import { db } from "@chiron/db";
import { seedAgents } from "./agents";
import { seedBrainstorming } from "./brainstorming";
import { seedWorkflows } from "./workflows";

describe("Brainstorming Workflow Seed", () => {
  it("should create brainstorming workflow with Step 1 configured", async () => {
    await seedAgents();
    await seedWorkflows();
    await seedBrainstorming();

    // Verify workflow exists
    const workflow = await db.query.workflows.findFirst({
      where: (workflows, { eq }) => eq(workflows.name, "brainstorming"),
    });

    expect(workflow).toBeDefined();
    expect(workflow?.name).toBe("brainstorming");
    expect(workflow?.displayName).toBe("Brainstorming");
    expect(workflow?.tags?.phase).toBe(0);
    expect(workflow?.tags?.module).toBe("bmm");

    // Verify Step 1 exists
    const step1 = await db.query.workflowSteps.findFirst({
      where: (steps, { eq, and }) =>
        and(eq(steps.workflowId, workflow?.id), eq(steps.stepNumber, 1)),
    });

    expect(step1).toBeDefined();
    expect(["agent", "display"]).toContain(step1?.stepType);
    expect(step1?.goal).toBeDefined();

    const config = step1?.config as any;

    if (step1?.stepType === "agent") {
      expect(step1?.goal).toBe("Define session topic, goals, and select brainstorming techniques");

      // Verify Step 1 config has 3 tools
      expect(config?.tools).toHaveLength(3);

      // Verify tool names
      const toolNames = config?.tools.map((t: any) => t.name);
      expect(toolNames).toContain("update_topic");
      expect(toolNames).toContain("update_goals");
      expect(toolNames).toContain("select_techniques");

      // Verify update_topic tool configuration
      const updateTopicTool = config?.tools.find((t: any) => t.name === "update_topic");
      expect(updateTopicTool?.toolType).toBe("update-variable");
      expect(updateTopicTool?.targetVariable).toBe("session_topic");
      expect(updateTopicTool?.requiresApproval).toBe(true);
      expect(updateTopicTool?.valueSchema?.type).toBe("string");

      // Verify update_goals tool configuration (array type)
      const updateGoalsTool = config?.tools.find((t: any) => t.name === "update_goals");
      expect(updateGoalsTool?.toolType).toBe("update-variable");
      expect(updateGoalsTool?.targetVariable).toBe("stated_goals");
      expect(updateGoalsTool?.requiresApproval).toBe(true);
      expect(updateGoalsTool?.valueSchema?.type).toBe("array");
      expect(updateGoalsTool?.requiredVariables).toContain("session_topic");

      // Verify select_techniques tool configuration (ax-generation)
      const selectTechniquesTool = config?.tools.find((t: any) => t.name === "select_techniques");
      expect(selectTechniquesTool?.toolType).toBe("ax-generation");
      expect(selectTechniquesTool?.requiresApproval).toBe(true);
      expect(selectTechniquesTool?.requiredVariables).toContain("stated_goals");
      expect(selectTechniquesTool?.optionsSource?.table).toBe("workflows");
      expect(selectTechniquesTool?.optionsSource?.filterBy).toHaveProperty(
        "tags->>'type'",
        "technique",
      );

      // Verify completion conditions
      expect(config?.completionConditions).toHaveLength(1);
      expect(config?.completionConditions?.[0]?.type).toBe("all-variables-set");
      expect(config?.completionConditions?.[0]?.requiredVariables).toHaveLength(3);
      expect(config?.completionConditions?.[0]?.requiredVariables).toContain("session_topic");
      expect(config?.completionConditions?.[0]?.requiredVariables).toContain("stated_goals");
      expect(config?.completionConditions?.[0]?.requiredVariables).toContain("selected_techniques");
    } else {
      expect(config).toBeDefined();
    }
  });
});
