import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestampDefault = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const methodologyDefinitions = sqliteTable(
  "methodology_definitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    name: text("name").notNull(),
    descriptionJson: text("description_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("methodology_definitions_key_idx").on(table.key)],
);

export const methodologyVersions = sqliteTable(
  "methodology_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyId: text("methodology_id")
      .notNull()
      .references(() => methodologyDefinitions.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    status: text("status").notNull().default("draft"),
    displayName: text("display_name").notNull(),
    definitionExtensions: text("definition_extensions_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("methodology_versions_mid_ver_idx").on(table.methodologyId, table.version),
    index("methodology_versions_mid_status_idx").on(table.methodologyId, table.status),
  ],
);

export const methodologyVersionEvents = sqliteTable(
  "methodology_version_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id"),
    changedFieldsJson: text("changed_fields_json", { mode: "json" }),
    diagnosticsJson: text("diagnostics_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
  },
  (table) => [
    index("methodology_version_events_lineage_idx").on(
      table.methodologyVersionId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const methodologyFactDefinitions = sqliteTable(
  "methodology_fact_definitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueType: text("value_type").notNull(),
    descriptionJson: text("description_json", { mode: "json" }),
    required: integer("required", { mode: "boolean" }).default(false).notNull(),
    defaultValueJson: text("default_value_json", { mode: "json" }),
    validationJson: text("validation_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_fact_defs_vid_key_idx").on(table.methodologyVersionId, table.key),
  ],
);

export const methodologyLinkTypeDefinitions = sqliteTable(
  "methodology_link_type_definitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    descriptionJson: text("description_json", { mode: "json" }),
    allowedStrengthsJson: text("allowed_strengths_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_link_type_defs_vid_key_idx").on(table.methodologyVersionId, table.key),
  ],
);

export const methodologyWorkUnitTypes = sqliteTable(
  "methodology_work_unit_types",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    displayName: text("display_name"),
    descriptionJson: text("description_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    cardinality: text("cardinality").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("methodology_wut_vid_key_idx").on(table.methodologyVersionId, table.key)],
);

export const methodologyAgentTypes = sqliteTable(
  "methodology_agent_types",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    displayName: text("display_name"),
    description: text("description"),
    persona: text("persona").notNull(),
    defaultModelJson: text("default_model_json", { mode: "json" }),
    mcpServersJson: text("mcp_servers_json", { mode: "json" }),
    capabilitiesJson: text("capabilities_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("methodology_at_vid_key_idx").on(table.methodologyVersionId, table.key)],
);

export const methodologyLifecycleStates = sqliteTable(
  "methodology_lifecycle_states",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => methodologyWorkUnitTypes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    displayName: text("display_name"),
    descriptionJson: text("description_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_ls_vid_wut_key_idx").on(
      table.methodologyVersionId,
      table.workUnitTypeId,
      table.key,
    ),
    index("methodology_ls_vid_wut_idx").on(table.methodologyVersionId, table.workUnitTypeId),
  ],
);

export const methodologyLifecycleTransitions = sqliteTable(
  "methodology_lifecycle_transitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => methodologyWorkUnitTypes.id, { onDelete: "cascade" }),
    fromStateId: text("from_state_id").references(() => methodologyLifecycleStates.id, {
      onDelete: "cascade",
    }),
    toStateId: text("to_state_id")
      .notNull()
      .references(() => methodologyLifecycleStates.id, { onDelete: "cascade" }),
    transitionKey: text("transition_key").notNull(),
    gateClass: text("gate_class").notNull(),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_lt_vid_wut_key_idx").on(
      table.methodologyVersionId,
      table.workUnitTypeId,
      table.transitionKey,
    ),
    index("methodology_lt_vid_wut_idx").on(table.methodologyVersionId, table.workUnitTypeId),
    index("methodology_lt_from_state_idx").on(table.fromStateId),
    index("methodology_lt_to_state_idx").on(table.toStateId),
  ],
);

export const methodologyFactSchemas = sqliteTable(
  "methodology_fact_schemas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => methodologyWorkUnitTypes.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    factType: text("fact_type").notNull(),
    required: integer("required", { mode: "boolean" }).default(true).notNull(),
    defaultValueJson: text("default_value_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_fs_vid_wut_key_idx").on(
      table.methodologyVersionId,
      table.workUnitTypeId,
      table.key,
    ),
    index("methodology_fs_vid_wut_idx").on(table.methodologyVersionId, table.workUnitTypeId),
  ],
);

export const methodologyTransitionRequiredLinks = sqliteTable(
  "methodology_transition_required_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    transitionId: text("transition_id")
      .notNull()
      .references(() => methodologyLifecycleTransitions.id, { onDelete: "cascade" }),
    linkTypeKey: text("link_type_key").notNull(),
    strength: text("strength").notNull(),
    required: integer("required", { mode: "boolean" }).default(true).notNull(),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_trl_vid_trans_link_idx").on(
      table.methodologyVersionId,
      table.transitionId,
      table.linkTypeKey,
    ),
    index("methodology_trl_vid_trans_idx").on(table.methodologyVersionId, table.transitionId),
  ],
);

export const methodologyWorkflows = sqliteTable(
  "methodology_workflows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id").references(() => methodologyWorkUnitTypes.id, {
      onDelete: "set null",
    }),
    key: text("key").notNull(),
    displayName: text("display_name"),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_workflows_vid_key_idx").on(table.methodologyVersionId, table.key),
    index("methodology_workflows_vid_wut_idx").on(table.methodologyVersionId, table.workUnitTypeId),
  ],
);

export const methodologyWorkflowSteps = sqliteTable(
  "methodology_workflow_steps",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    type: text("type").notNull(),
    displayName: text("display_name"),
    configJson: text("config_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_workflow_steps_wid_key_idx").on(table.workflowId, table.key),
    index("methodology_workflow_steps_vid_wid_idx").on(
      table.methodologyVersionId,
      table.workflowId,
    ),
  ],
);

export const methodologyWorkflowEdges = sqliteTable(
  "methodology_workflow_edges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "cascade" }),
    fromStepId: text("from_step_id").references(() => methodologyWorkflowSteps.id, {
      onDelete: "set null",
    }),
    toStepId: text("to_step_id").references(() => methodologyWorkflowSteps.id, {
      onDelete: "set null",
    }),
    edgeKey: text("edge_key"),
    conditionJson: text("condition_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("methodology_workflow_edges_vid_wid_idx").on(
      table.methodologyVersionId,
      table.workflowId,
    ),
    index("methodology_workflow_edges_from_step_idx").on(table.fromStepId),
    index("methodology_workflow_edges_to_step_idx").on(table.toStepId),
  ],
);

export const methodologyTransitionWorkflowBindings = sqliteTable(
  "methodology_transition_workflow_bindings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    transitionId: text("transition_id")
      .notNull()
      .references(() => methodologyLifecycleTransitions.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "cascade" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_twb_vid_transition_workflow_idx").on(
      table.methodologyVersionId,
      table.transitionId,
      table.workflowId,
    ),
    index("methodology_twb_vid_transition_idx").on(table.methodologyVersionId, table.transitionId),
  ],
);
