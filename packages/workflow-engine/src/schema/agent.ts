import * as Schema from "effect/Schema";

export const AgentToolSchema = Schema.Struct({
  name: Schema.String,
  toolType: Schema.Union(
    Schema.Literal("ax-generation"),
    Schema.Literal("database-query"),
    Schema.Literal("custom"),
    Schema.Literal("update-variable"),
  ),
  description: Schema.optional(Schema.String),
  usageGuidance: Schema.optional(Schema.String),
  required: Schema.optional(Schema.Boolean),
  requiredVariables: Schema.optional(Schema.Array(Schema.String)),
  requiresApproval: Schema.optional(Schema.Boolean),
  requireFeedbackOnOverride: Schema.optional(Schema.Boolean),

  targetVariable: Schema.optional(Schema.String),
  valueSchema: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),

  optionsSource: Schema.optional(
    Schema.Struct({
      table: Schema.String,
      selectFields: Schema.optional(Schema.Array(Schema.String)),
      distinctField: Schema.optional(Schema.String),
      filterBy: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
      orderBy: Schema.optional(Schema.String),
      outputVariable: Schema.String,
      requireFeedbackOnOverride: Schema.optional(Schema.Boolean),
      displayConfig: Schema.optional(
        Schema.Struct({
          cardLayout: Schema.Union(Schema.Literal("simple"), Schema.Literal("detailed")),
          fields: Schema.Struct({
            value: Schema.String,
            title: Schema.String,
            subtitle: Schema.optional(Schema.String),
            description: Schema.optional(Schema.String),
            sections: Schema.optional(
              Schema.Array(
                Schema.Struct({
                  label: Schema.String,
                  dataPath: Schema.String,
                  renderAs: Schema.String,
                  collapsible: Schema.optional(Schema.Boolean),
                  defaultExpanded: Schema.optional(Schema.Boolean),
                  itemFields: Schema.optional(
                    Schema.Record({ key: Schema.String, value: Schema.String }),
                  ),
                  childFields: Schema.optional(
                    Schema.Record({ key: Schema.String, value: Schema.String }),
                  ),
                }),
              ),
            ),
          }),
        }),
      ),
    }),
  ),

  axSignature: Schema.optional(
    Schema.Struct({
      input: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          type: Schema.String,
          source: Schema.Union(
            Schema.Literal("variable"),
            Schema.Literal("context"),
            Schema.Literal("playbook"),
          ),
          variableName: Schema.optional(Schema.String),
          selectFields: Schema.optional(Schema.Array(Schema.String)),
          description: Schema.optional(Schema.String),
        }),
      ),
      output: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          type: Schema.String,
          classesFrom: Schema.optional(
            Schema.Struct({ source: Schema.String, field: Schema.String }),
          ),
          extractFrom: Schema.optional(
            Schema.Struct({
              source: Schema.String,
              matchField: Schema.String,
              matchValue: Schema.String,
              selectField: Schema.String,
            }),
          ),
          description: Schema.optional(Schema.String),
          internal: Schema.optional(Schema.Boolean),
        }),
      ),
      strategy: Schema.optional(Schema.String),
    }),
  ),
});

export const EditableVariableSchema = Schema.Struct({
  key: Schema.String,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  placeholder: Schema.optional(Schema.String),
});

export const CompletionConditionSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("all-tools-approved"),
    requiredTools: Schema.Array(Schema.String),
  }),
  Schema.Struct({ type: Schema.Literal("agent-done") }),
  Schema.Struct({
    type: Schema.Literal("all-variables-set"),
    requiredVariables: Schema.Array(Schema.String),
  }),
  Schema.Struct({ type: Schema.Literal("manual") }),
);

export const AgentStepSchema = Schema.Struct({
  type: Schema.Literal("agent"),
  id: Schema.optional(Schema.String),
  agentKind: Schema.Union(Schema.Literal("chiron"), Schema.Literal("opencode")),
  agentId: Schema.String,
  model: Schema.optional(
    Schema.Struct({
      provider: Schema.Union(
        Schema.Literal("openrouter"),
        Schema.Literal("opencode"),
        Schema.Literal("anthropic"),
        Schema.Literal("openai"),
      ),
      modelId: Schema.String,
    }),
  ),

  message: Schema.optional(Schema.String),
  initialPrompt: Schema.optional(Schema.String),
  systemPromptBlock: Schema.optional(Schema.String),

  tools: Schema.optional(Schema.Array(AgentToolSchema)),
  editableVariables: Schema.optional(Schema.Array(EditableVariableSchema)),
  completionConditions: Schema.optional(Schema.Array(CompletionConditionSchema)),
});

export type AgentStepConfig = Schema.Schema.Type<typeof AgentStepSchema>;
