import { describe, expect, it } from "bun:test";
import type { ExecutionContext } from "./execution-context";
import {
  getVariable,
  hasVariable,
  resolveVariables,
  resolveVariablesInObject,
} from "./variable-resolver";

describe("Variable Resolver", () => {
  const mockContext: ExecutionContext = {
    systemVariables: {
      current_user_id: "user-123",
      execution_id: "exec-456",
      date: "2025-11-09",
      timestamp: "2025-11-09T12:00:00Z",
    },
    executionVariables: {
      project_name: "Test Project",
      complexity: "medium",
      metadata: {
        author: "Alice",
        version: "1.0",
      },
    },
    stepOutputs: {
      1: {
        recommended_track: "agile",
        score: 85,
      },
      2: {
        analysis: "Complete",
      },
    },
    defaultValues: {
      fallback_value: "default",
      timeout: 30,
    },
  };

  it("should resolve system variables (Level 1)", () => {
    const template = "User: {{current_user_id}}, Date: {{date}}";
    const result = resolveVariables(template, mockContext);

    expect(result).toBe("User: user-123, Date: 2025-11-09");
  });

  it("should resolve execution variables (Level 2)", () => {
    const template = "Project: {{project_name}}, Complexity: {{complexity}}";
    const result = resolveVariables(template, mockContext);

    expect(result).toBe("Project: Test Project, Complexity: medium");
  });

  it("should resolve step outputs (Level 3)", () => {
    const template = "Track: {{1.recommended_track}}, Score: {{1.score}}";
    const result = resolveVariables(template, mockContext);

    expect(result).toBe("Track: agile, Score: 85");
  });

  it("should resolve default values (Level 4)", () => {
    const template = "Fallback: {{fallback_value}}, Timeout: {{timeout}}";
    const result = resolveVariables(template, mockContext);

    expect(result).toBe("Fallback: default, Timeout: 30");
  });

  it("should respect precedence order (Level 1 > Level 2 > Level 3 > Level 4)", () => {
    const contextWithConflict: ExecutionContext = {
      systemVariables: {
        ...mockContext.systemVariables,
        name: "System",
      },
      executionVariables: {
        name: "Execution",
      },
      stepOutputs: {
        1: {
          name: "StepOutput",
        },
      },
      defaultValues: {
        name: "Default",
      },
    };

    const template = "Name: {{name}}";
    const result = resolveVariables(template, contextWithConflict);

    // Should use system variable (highest precedence)
    expect(result).toBe("Name: System");
  });

  it("should resolve nested variables", () => {
    const template = "Author: {{metadata.author}}, Version: {{metadata.version}}";
    const result = resolveVariables(template, mockContext);

    expect(result).toBe("Author: Alice, Version: 1.0");
  });

  it("should handle missing variables gracefully", () => {
    const template = "Missing: {{non_existent_var}}";
    const result = resolveVariables(template, mockContext);

    // Handlebars returns empty string for missing variables
    expect(result).toBe("Missing: ");
  });

  it("should support Handlebars built-in helpers", () => {
    const contextWithArray: ExecutionContext = {
      ...mockContext,
      executionVariables: {
        items: ["Apple", "Banana", "Cherry"],
      },
    };

    const template = "Items: {{#each items}}{{this}}, {{/each}}";
    const result = resolveVariables(template, contextWithArray);

    expect(result).toBe("Items: Apple, Banana, Cherry, ");
  });

  it("should resolve variables in objects recursively", () => {
    const obj = {
      title: "Project {{project_name}}",
      metadata: {
        user: "{{current_user_id}}",
        date: "{{date}}",
      },
      tags: ["{{complexity}}", "{{1.recommended_track}}"],
    };

    const result = resolveVariablesInObject(obj, mockContext);

    expect(result).toEqual({
      title: "Project Test Project",
      metadata: {
        user: "user-123",
        date: "2025-11-09",
      },
      tags: ["medium", "agile"],
    });
  });

  it("should check variable existence", () => {
    expect(hasVariable("current_user_id", mockContext)).toBe(true);
    expect(hasVariable("project_name", mockContext)).toBe(true);
    expect(hasVariable("fallback_value", mockContext)).toBe(true);
    expect(hasVariable("non_existent", mockContext)).toBe(false);
  });

  it("should get variable with precedence", () => {
    expect(getVariable("current_user_id", mockContext)).toBe("user-123");
    expect(getVariable("project_name", mockContext)).toBe("Test Project");
    expect(getVariable("1", mockContext)).toEqual({
      recommended_track: "agile",
      score: 85,
    });
  });

  it("should handle nested variable access", () => {
    expect(getVariable("metadata.author", mockContext)).toBe("Alice");
    expect(getVariable("metadata.version", mockContext)).toBe("1.0");
  });

  it("should return undefined for missing variables", () => {
    expect(getVariable("non_existent", mockContext)).toBeUndefined();
    expect(getVariable("metadata.missing", mockContext)).toBeUndefined();
  });
});
