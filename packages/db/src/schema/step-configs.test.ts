import { describe, expect, test } from "bun:test";
import {
  askUserChatStepConfigSchema,
  askUserStepConfigSchema,
  displayOutputStepConfigSchema,
  executeActionStepConfigSchema,
  llmGenerateStepConfigSchema,
  stepConfigSchema,
} from "./step-configs";

describe("Step Config Zod Schemas", () => {
  test("validates AskUserStepConfig correctly", () => {
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

    const result = askUserStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("rejects invalid AskUserStepConfig", () => {
    const invalidConfig = {
      question: "What is your project name?",
      responseType: "invalid_type", // Invalid enum value
      responseVariable: "project_name",
    };

    const result = askUserStepConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  test("validates AskUserChatStepConfig correctly", () => {
    const validConfig = {
      systemPrompt: "You are a helpful assistant",
      initialMessage: "How can I help you?",
      outputVariable: "chat_result",
      completionCondition: {
        type: "user-satisfied" as const,
      },
    };

    const result = askUserChatStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates ExecuteActionStepConfig correctly", () => {
    const validConfig = {
      actions: [{ type: "set-variable" as const }],
    };

    const result = executeActionStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates LLMGenerateStepConfig correctly", () => {
    const validConfig = {
      llmTask: {
        type: "classification" as const,
      },
      outputVariable: "classification_result",
    };

    const result = llmGenerateStepConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test("validates DisplayOutputStepConfig correctly", () => {
    const validConfig = {
      contentTemplate: "Hello {{name}}!",
    };

    const result = displayOutputStepConfigSchema.safeParse(validConfig);
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
        systemPrompt: "Test",
        initialMessage: "Test",
        outputVariable: "test",
        completionCondition: { type: "user-satisfied" as const },
      },
      {
        actions: [{ type: "set-variable" as const }],
      },
      {
        llmTask: { type: "classification" as const },
        outputVariable: "test",
      },
      {
        contentTemplate: "Test",
      },
    ];

    for (const config of configs) {
      const result = stepConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });
});
