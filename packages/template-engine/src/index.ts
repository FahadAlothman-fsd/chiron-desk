import Handlebars from "handlebars";

export interface RenderOptions {
  strict?: boolean;
}

export interface RenderResult {
  output: string;
  diagnostics: RenderDiagnostic[];
}

export interface RenderDiagnostic {
  type: "missing_variable" | "denied_helper";
  message: string;
}

export class TemplateEngineError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "TemplateEngineError";
  }
}

const ALLOWED_HELPERS = new Set([
  "if",
  "unless",
  "each",
  "with",
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "and",
  "or",
  "not",
  "default",
  "coalesce",
  "lookup",
]);

function isHelperAllowed(name: string): boolean {
  return ALLOWED_HELPERS.has(name);
}

function getUsedHelpers(templateText: string): string[] {
  const helpers = new Set<string>();

  // Match block helpers: {{#helper}} or {{/helper}}
  const blockRegex = /\{\{[#/]\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = blockRegex.exec(templateText)) !== null) {
    helpers.add(match[1]!);
  }

  // Match subexpressions: (helper ...)
  const subExprRegex = /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
  while ((match = subExprRegex.exec(templateText)) !== null) {
    const name = match[1]!;
    if (name !== "else") {
      helpers.add(name);
    }
  }

  return Array.from(helpers);
}

function validateHelpers(templateText: string, strict: boolean): RenderDiagnostic[] {
  const usedHelpers = getUsedHelpers(templateText);
  const diagnostics: RenderDiagnostic[] = [];

  for (const helper of usedHelpers) {
    if (!isHelperAllowed(helper)) {
      const diagnostic: RenderDiagnostic = {
        type: "denied_helper",
        message: `Helper '${helper}' is not in the phase-1 allowlist`,
      };
      if (strict) {
        throw new TemplateEngineError(diagnostic.message);
      }
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

// Comparison helpers
Handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

Handlebars.registerHelper("ne", function (a, b) {
  return a !== b;
});

Handlebars.registerHelper("gt", function (a, b) {
  return a > b;
});

Handlebars.registerHelper("gte", function (a, b) {
  return a >= b;
});

Handlebars.registerHelper("lt", function (a, b) {
  return a < b;
});

Handlebars.registerHelper("lte", function (a, b) {
  return a <= b;
});

// Boolean helpers
Handlebars.registerHelper("and", function (...args) {
  const values = args.slice(0, -1);
  return values.every(Boolean);
});

Handlebars.registerHelper("or", function (...args) {
  const values = args.slice(0, -1);
  return values.some(Boolean);
});

Handlebars.registerHelper("not", function (value) {
  return !value;
});

// Fallback helpers
Handlebars.registerHelper("default", function (value, defaultValue) {
  return value != null ? value : defaultValue;
});

Handlebars.registerHelper("coalesce", function (...args) {
  const values = args.slice(0, -1);
  for (const value of values) {
    if (value != null) return value;
  }
  return null;
});

export function render(
  templateText: string,
  context: Record<string, unknown> = {},
  options: RenderOptions = {},
): RenderResult {
  const strict = options.strict ?? true;
  const diagnostics: RenderDiagnostic[] = [];

  try {
    const helperDiagnostics = validateHelpers(templateText, strict);
    diagnostics.push(...helperDiagnostics);

    const template = Handlebars.compile(templateText, {
      strict: strict,
      noEscape: false,
    });

    const output = template(context);

    return {
      output,
      diagnostics,
    };
  } catch (error) {
    if (error instanceof TemplateEngineError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("not defined")) {
      throw new TemplateEngineError(`Missing variable: ${error.message}`, error);
    }
    throw new TemplateEngineError(
      `Template rendering failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}

export function validateTemplateHelpers(templateText: string): string[] {
  return getUsedHelpers(templateText).filter((h) => !isHelperAllowed(h));
}

export function listAllowedHelpers(): string[] {
  return Array.from(ALLOWED_HELPERS);
}
