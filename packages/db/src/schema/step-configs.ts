import { z } from "zod";

// ============================================
// ZOD SCHEMAS FOR WORKFLOW STEP CONFIGURATIONS
// These schemas provide runtime validation for JSONB step configs
// TypeScript types are inferred from these schemas for type safety
// ============================================

/**
 * FormStepConfig - Captures user input via form field
 *
 * @example
 * {
 *   type: "form",
 *   question: "What is your project name?",
 *   message: "Let's name your project",
 *   responseType: "string",
 *   responseVariable: "project_name",
 *   validation: {
 *     required: true,
 *     minLength: 3,
 *     maxLength: 50
 *   }
 * }
 */
export const formStepConfigSchema = z.object({
  type: z.literal("form").optional(), // Optional type field for explicit config
  question: z.string(),
  message: z.string().optional(), // Display message before the question
  responseType: z.enum(["string", "text", "number", "boolean", "choice", "path"]),
  responseVariable: z.string(),
  validation: z
    .object({
      required: z.boolean().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.number().optional(), // For number type
      max: z.number().optional(), // For number type
      pattern: z.string().optional(),
    })
    .optional(),
  choices: z
    .object({
      options: z.array(z.string()),
      allowCustom: z.boolean().optional(),
    })
    .optional(),
  // Path-specific configuration
  pathConfig: z
    .object({
      selectMode: z.enum(["file", "directory"]).optional(),
      mustExist: z.boolean().optional(),
      allowedExtensions: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * AgentStepConfig - Interactive chat dialog with LLM and dynamic tools
 *
 * @example
 * {
 *   agentId: "pm-agent-uuid",
 *   initialMessage: "Let's brainstorm ideas for your project!",
 *   tools: [
 *     {
 *       name: "update_summary",
 *       toolType: "ax-generation",
 *       requiredVariables: ["conversation_history"],
 *       requiresApproval: true,
 *       axSignature: {
 *         input: [
 *           { name: "conversation_history", type: "string", source: "context", description: "Chat history" },
 *           { name: "ace_context", type: "string", source: "playbook", description: "Learned patterns" }
 *         ],
 *         output: [
 *           { name: "project_description", type: "string", description: "Generated summary" },
 *           { name: "reasoning", type: "string", description: "Why this summary", internal: true }
 *         ],
 *         strategy: "ChainOfThought"
 *       }
 *     },
 *     {
 *       name: "fetch_workflow_paths",
 *       toolType: "database-query",
 *       requiredVariables: ["complexity_classification"],
 *       databaseQuery: {
 *         table: "workflow_paths",
 *         filters: [
 *           { field: "tags->>'fieldType'", operator: "eq", value: "{{detected_field_type}}" },
 *           { field: "tags->>'complexity'", operator: "eq", value: "{{complexity_classification}}" }
 *         ]
 *       }
 *     }
 *   ],
 *   completionCondition: {
 *     type: "all-tools-approved",
 *     requiredTools: ["update_summary", "update_complexity", "select_workflow_path", "generate_project_name"]
 *   },
 *   outputVariables: {
 *     project_description: "approval_states.update_summary.value",
 *     complexity_classification: "approval_states.update_complexity.value",
 *     selected_workflow_path_id: "approval_states.select_workflow_path.value",
 *     project_name: "approval_states.generate_project_name.value"
 *   }
 * }
 */
export const agentStepConfigSchema = z.object({
  type: z.literal("agent").optional(),
  agentKind: z.enum(["chiron", "opencode"]),
  agentId: z.string().uuid(),
  initialMessage: z.string().optional(),
  generateInitialMessage: z.boolean().optional(), // NEW: Generate first message dynamically
  initialPrompt: z.string().optional(), // NEW: System prompt for generation (supports {{parent.variable}} syntax)
  tools: z
    .array(
      z.object({
        name: z.string(),
        toolType: z.enum(["ax-generation", "database-query", "custom"]),
        description: z.string().optional(), // Tool description for LLM (what it does)
        usageGuidance: z.string().optional(), // When/how to use this tool (injected into agent instructions)
        requiredVariables: z.array(z.string()).optional(),
        requiresApproval: z.boolean().optional(),
        requireFeedbackOnOverride: z.boolean().optional(), // Show feedback textarea when user selects non-AI option
        // Dynamic options source - fetch options from database before tool execution
        optionsSource: z
          .object({
            table: z.string(), // Table to query
            selectFields: z.array(z.string()).optional(), // Fields to fetch (default: all fields)
            distinctField: z.string().optional(), // Field to get unique values from (supports JSONB like "tags->'complexity'")
            filterBy: z.record(z.string(), z.string()).optional(), // Optional filters (supports {{variable}} syntax)
            orderBy: z.string().optional(), // Field to order by
            outputVariable: z.string(), // Variable name to store fetched options
            requireFeedbackOnOverride: z.boolean().optional(), // Show feedback textarea when user selects non-AI option
            // Display configuration - how to render options in approval cards
            displayConfig: z
              .object({
                cardLayout: z.enum(["simple", "detailed"]), // Card complexity level
                fields: z.object({
                  // Core fields (required)
                  value: z.string(), // JSON path to the value field (what gets submitted)
                  title: z.string(), // JSON path to title field
                  // Optional fields
                  subtitle: z.string().optional(), // JSON path to subtitle field
                  description: z.string().optional(), // JSON path to description field
                  // Nested expandable sections (for detailed cards)
                  sections: z
                    .array(
                      z.object({
                        label: z.string(), // Section header ("Phases & Workflows")
                        icon: z.string().optional(), // Emoji/icon prefix
                        dataPath: z.string(), // JSON path to array data
                        renderAs: z.enum(["list", "nested-list", "grid"]), // Render style
                        collapsible: z.boolean().optional(), // Allow expand/collapse
                        defaultExpanded: z.boolean().optional(), // Start expanded/collapsed
                        // How to render each item in the section
                        itemFields: z.object({
                          title: z.string(), // Item title field
                          subtitle: z.string().optional(), // Item subtitle field
                          icon: z.string().optional(), // Static icon or field path
                          // For nested lists (recursive)
                          children: z.string().optional(), // JSON path to child array
                          childFields: z
                            .object({
                              title: z.string(),
                              icon: z.string().optional(),
                            })
                            .optional(),
                        }),
                      }),
                    )
                    .optional(),
                }),
              })
              .optional(),
          })
          .optional(),
        // Ax-generation specific config
        axSignature: z
          .object({
            input: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                source: z.enum(["variable", "context", "literal", "playbook"]),
                variableName: z.string().optional(), // For source: "variable"
                defaultValue: z.unknown().optional(), // For source: "literal"
                description: z.string(),
                internal: z.boolean().optional(), // If true, hidden from approval UI
              }),
            ),
            output: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
                description: z.string(),
                internal: z.boolean().optional(), // If true, not shown in approval
              }),
            ),
            strategy: z.enum(["ChainOfThought", "Predict"]),
          })
          .optional(),
        // Database-query specific config
        databaseQuery: z
          .object({
            table: z.string(),
            filters: z.array(
              z.object({
                field: z.string(), // Supports JSONB paths like "tags->>'complexity'"
                operator: z.enum(["eq", "contains", "gt", "lt"]),
                value: z.string(), // Can use {{variable}} syntax
              }),
            ),
            outputVariable: z.string(), // Variable name to store results
          })
          .optional(),
        // Custom tool specific config
        customToolHandler: z.string().optional(), // Handler function name
      }),
    )
    .optional(),
  completionCondition: z.object({
    type: z.enum(["user-satisfied", "all-tools-approved", "confidence-threshold", "max-turns"]),
    requiredTools: z.array(z.string()).optional(), // For "all-tools-approved"
    threshold: z.number().optional(),
    maxTurns: z.number().optional(),
  }),
  outputVariables: z.record(z.string(), z.string()).optional(), // Map output variable names to paths in execution.variables
});

/**
 * ActionStepConfig - Execute system actions
 *
 * @example
 * {
 *   actions: [
 *     { type: "set-variable", config: { variable: "foo", value: "bar" } },
 *     { type: "git", config: { operation: "init", path: "{{project_path}}" } },
 *     { type: "database", config: { table: "projects", operation: "update", columns: { name: "{{project_name}}" }, where: { id: "{{project_id}}" } } }
 *   ]
 * }
 */
export const actionStepConfigSchema = z.object({
  actions: z.array(
    z.discriminatedUnion("type", [
      // Set variable action
      z.object({
        type: z.literal("set-variable"),
        config: z.object({
          variable: z.string(),
          value: z.unknown(),
        }),
      }),
      // Git action (Story 1.8)
      z.object({
        type: z.literal("git"),
        config: z.object({
          operation: z.enum(["init", "commit", "push"]),
          path: z.string(), // Supports {{variable}} syntax
          message: z.string().optional(), // For commit operations
        }),
      }),
      // Database action (Story 1.8)
      z.object({
        type: z.literal("database"),
        config: z.object({
          table: z.string(),
          operation: z.enum(["update", "insert"]),
          columns: z.record(z.string(), z.unknown()), // Column values, supports {{variable}} syntax
          where: z.record(z.string(), z.unknown()).optional(), // For update operations
        }),
      }),
      // File action (future)
      z.object({
        type: z.literal("file"),
        config: z.object({
          operation: z.enum(["create", "read", "write", "delete"]),
          path: z.string(),
          content: z.string().optional(),
        }),
      }),
    ]),
  ),
  executionMode: z.enum(["sequential", "parallel"]).optional(),
  requiresUserConfirmation: z.boolean().optional(),
});

/**
/**
 * DisplayStepConfig - Show message to user
 *
 * @example
 * {
 *   contentTemplate: "Project {{project_name}} created successfully!"
 * }
 */
export const displayStepConfigSchema = z.object({
  contentTemplate: z.string(), // Handlebars template
});

/**
 * InvokeStepConfig - Spawn child workflow executions
 *
 * @example
 * {
 *   workflowsToInvoke: "{{techniques}}",  // Variable reference resolving to array of workflow IDs
 *   variableMapping: {
 *     session_topic: "{{topic}}",  // Child uses {{parent.session_topic}}, gets from parent's {{topic}}
 *     stated_goals: "{{goals}}"
 *   },
 *   expectedOutputVariable: "generated_ideas",  // Variable to read from each child
 *   aggregateInto: "captured_ideas",  // Parent variable to append child outputs
 *   completionCondition: { type: "all-complete" }
 * }
 */
export const invokeStepConfigSchema = z.object({
  workflowsToInvoke: z.string(), // Variable reference e.g., "{{techniques}}"
  variableMapping: z.record(z.string(), z.string()), // Map child var names to parent var references
  expectedOutputVariable: z.string(), // Variable name to read from each child
  aggregateInto: z.string(), // Parent variable to append child outputs
  completionCondition: z.object({
    type: z.literal("all-complete"), // Wait for all children to reach status = completed
  }),
});

/**
 * Union schema for all step config types
 * Use this for runtime validation of any step config
 */
export const stepConfigSchema = z.union([
  formStepConfigSchema,
  agentStepConfigSchema,
  actionStepConfigSchema,
  displayStepConfigSchema,
  invokeStepConfigSchema,
]);

// ============================================
// TYPESCRIPT TYPES (Inferred from Zod schemas)
// ============================================

export type FormStepConfig = z.infer<typeof formStepConfigSchema>;
export type AgentStepConfig = z.infer<typeof agentStepConfigSchema>;
export type ActionStepConfig = z.infer<typeof actionStepConfigSchema>;
export type DisplayStepConfig = z.infer<typeof displayStepConfigSchema>;
export type InvokeStepConfig = z.infer<typeof invokeStepConfigSchema>;
export type StepConfig = z.infer<typeof stepConfigSchema>;
