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
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
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
    name: text("name"),
    key: text("key").notNull(),
    valueType: text("value_type").notNull(),
    cardinality: text("cardinality").notNull().default("one"),
    descriptionJson: text("description_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
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
    name: text("display_name"),
    descriptionJson: text("description_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
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
    descriptionJson: text("description_json", { mode: "json" }),
    persona: text("persona").notNull(),
    defaultModelJson: text("default_model_json", { mode: "json" }),
    mcpServersJson: text("mcp_servers_json", { mode: "json" }),
    capabilitiesJson: text("capabilities_json", { mode: "json" }),
    promptTemplateJson: text("prompt_template_json", { mode: "json" }),
    promptTemplateVersion: integer("prompt_template_version").default(1).notNull(),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("methodology_at_vid_key_idx").on(table.methodologyVersionId, table.key)],
);

export const workUnitLifecycleStates = sqliteTable(
  "work_unit_lifecycle_states",
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

export const workUnitLifecycleTransitions = sqliteTable(
  "work_unit_lifecycle_transitions",
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
    fromStateId: text("from_state_id").references(() => workUnitLifecycleStates.id, {
      onDelete: "set null",
    }),
    toStateId: text("to_state_id").references(() => workUnitLifecycleStates.id, {
      onDelete: "set null",
    }),
    transitionKey: text("transition_key").notNull(),
    descriptionJson: text("description_json", { mode: "json" }),
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

export const workUnitFactDefinitions = sqliteTable(
  "work_unit_fact_definitions",
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
    name: text("name"),
    key: text("key").notNull(),
    factType: text("fact_type").notNull(),
    cardinality: text("cardinality").notNull().default("one"),
    descriptionJson: text("description_json", { mode: "json" }),
    defaultValueJson: text("default_value_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    validationJson: text("validation_json", { mode: "json" }),
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

export const methodologyArtifactSlotDefinitions = sqliteTable(
  "methodology_artifact_slot_definitions",
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
    cardinality: text("cardinality").notNull(),
    rulesJson: text("rules_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_asd_vid_wut_key_idx").on(
      table.methodologyVersionId,
      table.workUnitTypeId,
      table.key,
    ),
    index("methodology_asd_vid_wut_idx").on(table.methodologyVersionId, table.workUnitTypeId),
  ],
);

export const methodologyArtifactSlotTemplates = sqliteTable(
  "methodology_artifact_slot_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    slotDefinitionId: text("slot_definition_id")
      .notNull()
      .references(() => methodologyArtifactSlotDefinitions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    displayName: text("display_name"),
    descriptionJson: text("description_json", { mode: "json" }),
    guidanceJson: text("guidance_json", { mode: "json" }),
    content: text("content"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_ast_slot_key_idx").on(table.slotDefinitionId, table.key),
    index("methodology_ast_vid_slot_idx").on(table.methodologyVersionId, table.slotDefinitionId),
  ],
);

export const transitionConditionSets = sqliteTable(
  "transition_condition_sets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    transitionId: text("transition_id")
      .notNull()
      .references(() => workUnitLifecycleTransitions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    phase: text("phase").notNull(),
    mode: text("mode").notNull().default("all"),
    groupsJson: text("groups_json", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("transition_condition_sets_transition_phase_idx").on(
      table.transitionId,
      table.phase,
    ),
    index("methodology_tcs_vid_transition_idx").on(table.methodologyVersionId, table.transitionId),
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
    descriptionJson: text("description_json", { mode: "json" }),
    metadataJson: text("metadata_json", { mode: "json" }),
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
    descriptionMarkdown: text("description_markdown"),
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

export const methodologyWorkflowFormFields = sqliteTable(
  "methodology_workflow_form_fields",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    formStepId: text("form_step_id")
      .notNull()
      .references(() => methodologyWorkflowSteps.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label"),
    valueType: text("value_type").notNull(),
    required: integer("required", { mode: "boolean" }).notNull().default(false),
    inputJson: text("input_json", { mode: "json" }).notNull(),
    descriptionJson: text("description_json", { mode: "json" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("methodology_workflow_form_fields_step_key_idx").on(table.formStepId, table.key),
    index("methodology_workflow_form_fields_step_order_idx").on(table.formStepId, table.sortOrder),
  ],
);

export const methodologyWorkflowContextFactDefinitions = sqliteTable(
  "methodology_workflow_context_fact_definitions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workflowId: text("workflow_definition_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "cascade" }),
    factKey: text("fact_key").notNull(),
    factKind: text("fact_kind").notNull(),
    label: text("label"),
    descriptionJson: text("description_json", { mode: "json" }),
    cardinality: text("cardinality").notNull().default("one"),
    guidanceJson: text("guidance_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(timestampDefault).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("methodology_workflow_context_fact_defs_wid_key_idx").on(
      table.workflowId,
      table.factKey,
    ),
    index("methodology_workflow_context_fact_defs_wid_kind_idx").on(
      table.workflowId,
      table.factKind,
    ),
  ],
);

export const methodologyWorkflowContextFactPlainValues = sqliteTable(
  "methodology_workflow_context_fact_plain_values",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "cascade" }),
    valueType: text("value_type").notNull(),
  },
  (table) => [uniqueIndex("methodology_wf_ctx_plain_def_idx").on(table.contextFactDefinitionId)],
);

export const methodologyWorkflowContextFactExternalBindings = sqliteTable(
  "methodology_workflow_context_fact_external_bindings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    bindingKey: text("binding_key").notNull(),
  },
  (table) => [uniqueIndex("methodology_wf_ctx_external_def_idx").on(table.contextFactDefinitionId)],
);

export const methodologyWorkflowContextFactWorkflowReferences = sqliteTable(
  "methodology_workflow_context_fact_workflow_refs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "cascade" }),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("methodology_wf_ctx_wf_ref_def_idx").on(table.contextFactDefinitionId),
    uniqueIndex("methodology_wf_ctx_wf_ref_def_workflow_idx").on(
      table.contextFactDefinitionId,
      table.workflowDefinitionId,
    ),
  ],
);

export const methodologyWorkflowContextFactArtifactReferences = sqliteTable(
  "methodology_workflow_context_fact_artifact_refs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "cascade" }),
    artifactSlotKey: text("artifact_slot_key").notNull(),
  },
  (table) => [
    uniqueIndex("methodology_wf_ctx_artifact_ref_def_idx").on(table.contextFactDefinitionId),
  ],
);

export const methodologyWorkflowContextFactDraftSpecs = sqliteTable(
  "methodology_workflow_context_fact_draft_specs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("methodology_wf_ctx_draft_spec_def_idx").on(table.contextFactDefinitionId),
  ],
);

export const methodologyWorkflowContextFactDraftSpecFields = sqliteTable(
  "methodology_workflow_context_fact_draft_spec_fields",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    draftSpecId: text("draft_spec_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDraftSpecs.id, { onDelete: "cascade" }),
    workUnitFactDefinitionId: text("work_unit_fact_definition_id")
      .notNull()
      .references(() => workUnitFactDefinitions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("methodology_wf_ctx_draft_spec_fact_def_idx").on(
      table.draftSpecId,
      table.workUnitFactDefinitionId,
    ),
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
      .references(() => workUnitLifecycleTransitions.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "cascade" }),
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
