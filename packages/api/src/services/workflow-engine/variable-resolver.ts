import Handlebars from "handlebars";
import type { ExecutionContext } from "./execution-context";

/**
 * Variable Resolver - Resolves {{variable}} syntax using Handlebars
 * with 4-level precedence: System > Execution > Step Outputs > Defaults
 */

export class VariableResolutionError extends Error {
  constructor(
    message: string,
    public variable: string,
  ) {
    super(message);
    this.name = "VariableResolutionError";
  }
}

/**
 * Resolve variables in a template using execution context
 * @param template - Template string with {{variable}} placeholders
 * @param context - Execution context with 4-level precedence
 * @returns Resolved string
 */
export function resolveVariables(template: string, context: ExecutionContext): string {
  try {
    // Build merged context with correct precedence
    // Level 1 (System) > Level 2 (Execution) > Level 3 (Step Outputs) > Level 4 (Defaults)
    const mergedContext = {
      ...context.defaultValues, // Level 4 (lowest precedence)
      ...context.stepOutputs, // Level 3
      ...context.executionVariables, // Level 2
      ...context.systemVariables, // Level 1 (highest precedence)
    };

    // Compile and execute template
    const compiledTemplate = Handlebars.compile(template, {
      strict: false, // Don't throw on missing variables (return empty string instead)
      noEscape: true, // Don't HTML-escape output
    });

    return compiledTemplate(mergedContext);
  } catch (error) {
    throw new VariableResolutionError(
      `Failed to resolve variables in template: ${error instanceof Error ? error.message : "Unknown error"}`,
      template,
    );
  }
}

/**
 * Resolve variables in an object (recursive)
 * Useful for resolving variables in config objects
 */
export function resolveVariablesInObject<T>(obj: T, context: ExecutionContext): T {
  if (typeof obj === "string") {
    return resolveVariables(obj, context) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveVariablesInObject(item, context)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveVariablesInObject(value, context);
    }
    return result;
  }

  return obj;
}

/**
 * Check if a variable exists in context (any level)
 */
export function hasVariable(variableName: string, context: ExecutionContext): boolean {
  return (
    variableName in context.systemVariables ||
    variableName in context.executionVariables ||
    variableName in context.stepOutputs ||
    variableName in context.defaultValues
  );
}

/**
 * Get variable value with precedence
 * @param variableName - Variable name (can include dots for nested access)
 * @param context - Execution context
 * @returns Variable value or undefined
 */
export function getVariable(variableName: string, context: ExecutionContext): unknown {
  // Build merged context with precedence
  const mergedContext = {
    ...context.defaultValues,
    ...context.stepOutputs,
    ...context.executionVariables,
    ...context.systemVariables,
  };

  // Handle nested access (e.g., "user.name", "array[0]")
  const parts = variableName.split(".");
  let value: any = mergedContext;

  for (const part of parts) {
    if (value === undefined || value === null) {
      return undefined;
    }

    // Handle array access (e.g., "items[0]")
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      value = value[arrayName]?.[Number(index)];
    } else {
      value = value[part];
    }
  }

  return value;
}
