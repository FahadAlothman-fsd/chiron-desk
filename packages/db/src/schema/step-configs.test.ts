import { describe, expect, test } from "bun:test";
import {
  actionStepConfigSchema,
  agentStepConfigSchema,
  displayStepConfigSchema,
  formStepConfigSchema,
  invokeStepConfigSchema,
  stepConfigSchema,
} from "./step-configs";

describe("Step Config Zod Schemas", () => {
  test("validates FormStepConfig correctly", () => {
    const validConfig = {
      question: "What is your project name?",
      responseType: "string" as const,
      responseVariable: "project_name",
      validation: {
        required: true,
        minLength: 3,
        maxLength: 50,
      },
    };

    const result = formStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("rejects invalid FormStepConfig", () => {
    const invalidConfig = {
      question: "What is your project name?",
      responseType: "invalid_type", // Invalid enum value
      responseVariable: "project_name",
    };

    const result = formStepConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  test("validates AgentStepConfig correctly", () => {
    const validConfig = {
      agentKind: "chiron" as const,
      agentId: "00000000-0000-0000-0000-000000000000",
      initialMessage: "How can I help you?",
      completionCondition: {
        type: "user-satisfied" as const,
      },
    };

    const result = agentStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates ActionStepConfig correctly", () => {
    const validConfig = {
      actions: [
        {
          type: "set-variable" as const,
          config: {
            variable: "foo",
            value: "bar",
          },
        },
      ],
    };

    const result = actionStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates DisplayStepConfig correctly", () => {
    const validConfig = {
      contentTemplate: "Hello {{name}}!",
    };

    const result = displayStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates InvokeStepConfig correctly", () => {
    const validConfig = {
      workflowsToInvoke: "{{techniques}}",
      variableMapping: { session_topic: "{{topic}}" },
      expectedOutputVariable: "generated_ideas",
      aggregateInto: "captured_ideas",
      completionCondition: { type: "all-complete" as const },
    };

    const result = invokeStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("union schema accepts all step config types", () => {
    const configs = [
      {
        question: "Test?",
        responseType: "string" as const,
        responseVariable: "test",
      },
      {
        agentKind: "chiron" as const,
        agentId: "00000000-0000-0000-0000-000000000000",
        initialMessage: "Test",
        completionCondition: { type: "user-satisfied" as const },
      },
      {
        actions: [
          {
            type: "set-variable" as const,
            config: { variable: "foo", value: "bar" },
          },
        ],
      },
      {
        contentTemplate: "Test",
      },
      {
        workflowsToInvoke: "{{techniques}}",
        variableMapping: { session_topic: "{{topic}}" },
        expectedOutputVariable: "generated_ideas",
        aggregateInto: "captured_ideas",
        completionCondition: { type: "all-complete" as const },
      },
    ];

    for (const config of configs) {
      const result = stepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });
});
