import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { AGENT_STEP_RUNTIME_STATES, WORKFLOW_CONTEXT_FACT_KINDS } from "@chiron/contracts";

import {
  methodologyArtifactSlotDefinitions,
  methodologyWorkflowContextFactDefinitions,
  methodologyFactDefinitions,
  methodologyWorkflowInvokeSteps,
  methodologyWorkflowSteps,
  methodologyWorkUnitTypes,
  workUnitFactDefinitions,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
  methodologyWorkflows,
} from "./methodology";
import { projects } from "./project";

const timestampDefault = sql`(cast(unixepoch('subsec') * 1000 as integer))`;
const agentStepHarnessBindingStates = ["unbound", "binding", "bound", "errored"] as const;

export const projectWorkUnits = sqliteTable(
  "project_work_units",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => methodologyWorkUnitTypes.id, { onDelete: "restrict" }),
    currentStateId: text("current_state_id").references(() => workUnitLifecycleStates.id, {
      onDelete: "restrict",
    }),
    activeTransitionExecutionId: text("active_transition_execution_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_work_units_project_idx").on(table.projectId, table.createdAt, table.id),
    index("project_work_units_type_idx").on(table.workUnitTypeId),
    index("project_work_units_current_state_idx").on(table.currentStateId),
    index("project_work_units_active_transition_idx").on(table.activeTransitionExecutionId),
  ],
);

export const transitionExecutions = sqliteTable(
  "transition_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectWorkUnitId: text("project_work_unit_id")
      .notNull()
      .references(() => projectWorkUnits.id, { onDelete: "cascade" }),
    transitionId: text("transition_id")
      .notNull()
      .references(() => workUnitLifecycleTransitions.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["active", "completed", "superseded"] }).notNull(),
    primaryWorkflowExecutionId: text("primary_workflow_execution_id"),
    supersededByTransitionExecutionId: text("superseded_by_transition_execution_id").references(
      (): AnySQLiteColumn => transitionExecutions.id,
      { onDelete: "set null" },
    ),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    supersededAt: integer("superseded_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("transition_execs_work_unit_idx").on(table.projectWorkUnitId, table.startedAt, table.id),
    index("transition_execs_transition_idx").on(table.transitionId),
    index("transition_execs_status_idx").on(table.status),
    index("transition_execs_primary_workflow_idx").on(table.primaryWorkflowExecutionId),
    index("transition_execs_superseded_by_idx").on(table.supersededByTransitionExecutionId),
  ],
);

export const workflowExecutions = sqliteTable(
  "workflow_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transitionExecutionId: text("transition_execution_id")
      .notNull()
      .references(() => transitionExecutions.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "restrict" }),
    workflowRole: text("workflow_role", { enum: ["primary", "supporting"] }).notNull(),
    status: text("status", {
      enum: ["active", "completed", "superseded", "parent_superseded"],
    }).notNull(),
    currentStepExecutionId: text("current_step_execution_id").references(
      (): AnySQLiteColumn => stepExecutions.id,
      { onDelete: "set null" },
    ),
    supersededByWorkflowExecutionId: text("superseded_by_workflow_execution_id").references(
      (): AnySQLiteColumn => workflowExecutions.id,
      { onDelete: "set null" },
    ),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    supersededAt: integer("superseded_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("workflow_execs_transition_idx").on(
      table.transitionExecutionId,
      table.startedAt,
      table.id,
    ),
    index("workflow_execs_workflow_idx").on(table.workflowId),
    index("workflow_execs_role_idx").on(table.workflowRole),
    index("workflow_execs_status_idx").on(table.status),
    index("workflow_execs_current_step_idx").on(table.currentStepExecutionId),
    index("workflow_execs_superseded_by_idx").on(table.supersededByWorkflowExecutionId),
  ],
);

export const projectFactInstances = sqliteTable(
  "project_fact_instances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    factDefinitionId: text("fact_definition_id")
      .notNull()
      .references(() => methodologyFactDefinitions.id, { onDelete: "restrict" }),
    valueJson: text("value_json", { mode: "json" }),
    status: text("status", { enum: ["active", "superseded", "parent_superseded"] }).notNull(),
    supersededByFactInstanceId: text("superseded_by_fact_instance_id").references(
      (): AnySQLiteColumn => projectFactInstances.id,
      { onDelete: "set null" },
    ),
    producedByTransitionExecutionId: text("produced_by_transition_execution_id").references(
      () => transitionExecutions.id,
      { onDelete: "set null" },
    ),
    producedByWorkflowExecutionId: text("produced_by_workflow_execution_id").references(
      () => workflowExecutions.id,
      { onDelete: "set null" },
    ),
    authoredByUserId: text("authored_by_user_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("project_fact_instances_project_idx").on(table.projectId, table.createdAt, table.id),
    index("project_fact_instances_definition_idx").on(table.factDefinitionId),
    index("project_fact_instances_status_idx").on(table.status),
    index("project_fact_instances_superseded_by_idx").on(table.supersededByFactInstanceId),
    index("project_fact_instances_transition_idx").on(table.producedByTransitionExecutionId),
    index("project_fact_instances_workflow_idx").on(table.producedByWorkflowExecutionId),
  ],
);

export const workUnitFactInstances = sqliteTable(
  "work_unit_fact_instances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectWorkUnitId: text("project_work_unit_id")
      .notNull()
      .references(() => projectWorkUnits.id, { onDelete: "cascade" }),
    factDefinitionId: text("fact_definition_id")
      .notNull()
      .references(() => workUnitFactDefinitions.id, { onDelete: "restrict" }),
    valueJson: text("value_json", { mode: "json" }),
    referencedProjectWorkUnitId: text("referenced_project_work_unit_id").references(
      () => projectWorkUnits.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: ["active", "superseded", "parent_superseded"] }).notNull(),
    supersededByFactInstanceId: text("superseded_by_fact_instance_id").references(
      (): AnySQLiteColumn => workUnitFactInstances.id,
      { onDelete: "set null" },
    ),
    producedByTransitionExecutionId: text("produced_by_transition_execution_id").references(
      () => transitionExecutions.id,
      { onDelete: "set null" },
    ),
    producedByWorkflowExecutionId: text("produced_by_workflow_execution_id").references(
      () => workflowExecutions.id,
      { onDelete: "set null" },
    ),
    authoredByUserId: text("authored_by_user_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("work_unit_fact_instances_work_unit_idx").on(
      table.projectWorkUnitId,
      table.createdAt,
      table.id,
    ),
    index("work_unit_fact_instances_definition_idx").on(table.factDefinitionId),
    index("work_unit_fact_instances_referenced_wu_idx").on(table.referencedProjectWorkUnitId),
    index("work_unit_fact_instances_status_idx").on(table.status),
    index("work_unit_fact_instances_superseded_by_idx").on(table.supersededByFactInstanceId),
    index("work_unit_fact_instances_transition_idx").on(table.producedByTransitionExecutionId),
    index("work_unit_fact_instances_workflow_idx").on(table.producedByWorkflowExecutionId),
  ],
);

export const projectArtifactSnapshots = sqliteTable(
  "project_artifact_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectWorkUnitId: text("project_work_unit_id")
      .notNull()
      .references(() => projectWorkUnits.id, { onDelete: "cascade" }),
    slotDefinitionId: text("slot_definition_id")
      .notNull()
      .references(() => methodologyArtifactSlotDefinitions.id, { onDelete: "restrict" }),
    recordedByTransitionExecutionId: text("recorded_by_transition_execution_id").references(
      () => transitionExecutions.id,
      { onDelete: "set null" },
    ),
    recordedByWorkflowExecutionId: text("recorded_by_workflow_execution_id").references(
      () => workflowExecutions.id,
      { onDelete: "set null" },
    ),
    recordedByUserId: text("recorded_by_user_id"),
    supersededByProjectArtifactSnapshotId: text(
      "superseded_by_project_artifact_snapshot_id",
    ).references((): AnySQLiteColumn => projectArtifactSnapshots.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("project_artifact_snapshots_work_unit_idx").on(
      table.projectWorkUnitId,
      table.createdAt,
      table.id,
    ),
    index("project_artifact_snapshots_slot_idx").on(table.slotDefinitionId),
    index("project_artifact_snapshots_transition_idx").on(table.recordedByTransitionExecutionId),
    index("project_artifact_snapshots_workflow_idx").on(table.recordedByWorkflowExecutionId),
    index("project_artifact_snapshots_superseded_by_idx").on(
      table.supersededByProjectArtifactSnapshotId,
    ),
  ],
);

export const artifactSnapshotFiles = sqliteTable(
  "artifact_snapshot_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    artifactSnapshotId: text("artifact_snapshot_id")
      .notNull()
      .references(() => projectArtifactSnapshots.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    memberStatus: text("member_status", { enum: ["present", "removed"] }).notNull(),
    gitCommitHash: text("git_commit_hash"),
    gitBlobHash: text("git_blob_hash"),
  },
  (table) => [
    index("artifact_snapshot_files_snapshot_idx").on(table.artifactSnapshotId),
    index("artifact_snapshot_files_snapshot_path_idx").on(table.artifactSnapshotId, table.filePath),
    index("artifact_snapshot_files_member_status_idx").on(table.memberStatus),
  ],
);

export const stepExecutions = sqliteTable(
  "step_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workflowExecutionId: text("workflow_execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepDefinitionId: text("step_definition_id")
      .notNull()
      .references(() => methodologyWorkflowSteps.id, { onDelete: "restrict" }),
    stepType: text("step_type").notNull(),
    status: text("status").notNull(),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    previousStepExecutionId: text("previous_step_execution_id").references(
      (): AnySQLiteColumn => stepExecutions.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    index("step_executions_workflow_idx").on(
      table.workflowExecutionId,
      table.activatedAt,
      table.id,
    ),
    index("step_executions_step_definition_idx").on(table.stepDefinitionId),
    index("step_executions_previous_step_idx").on(table.previousStepExecutionId),
    index("step_executions_status_idx").on(table.status),
  ],
);

export const invokeStepExecutionState = sqliteTable(
  "invoke_step_execution_state",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    invokeStepDefinitionId: text("invoke_step_definition_id")
      .notNull()
      .references(() => methodologyWorkflowInvokeSteps.stepId, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("invoke_step_execution_state_step_idx").on(table.stepExecutionId)],
);

export const invokeWorkflowTargetExecution = sqliteTable(
  "invoke_workflow_target_execution",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invokeStepExecutionStateId: text("invoke_step_execution_state_id")
      .notNull()
      .references(() => invokeStepExecutionState.id, { onDelete: "cascade" }),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => methodologyWorkflows.id, { onDelete: "restrict" }),
    workflowExecutionId: text("workflow_execution_id").references(() => workflowExecutions.id, {
      onDelete: "set null",
    }),
    resolutionOrder: integer("resolution_order"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("invoke_workflow_target_execution_root_idx").on(
      table.invokeStepExecutionStateId,
      table.createdAt,
      table.id,
    ),
    index("invoke_workflow_target_execution_definition_idx").on(table.workflowDefinitionId),
    index("invoke_workflow_target_execution_workflow_execution_idx").on(table.workflowExecutionId),
  ],
);

export const invokeWorkUnitTargetExecution = sqliteTable(
  "invoke_work_unit_target_execution",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invokeStepExecutionStateId: text("invoke_step_execution_state_id")
      .notNull()
      .references(() => invokeStepExecutionState.id, { onDelete: "cascade" }),
    projectWorkUnitId: text("project_work_unit_id").references(() => projectWorkUnits.id, {
      onDelete: "set null",
    }),
    workUnitDefinitionId: text("work_unit_definition_id")
      .notNull()
      .references(() => methodologyWorkUnitTypes.id, { onDelete: "restrict" }),
    transitionDefinitionId: text("transition_definition_id")
      .notNull()
      .references(() => workUnitLifecycleTransitions.id, { onDelete: "restrict" }),
    transitionExecutionId: text("transition_execution_id").references(
      () => transitionExecutions.id,
      {
        onDelete: "set null",
      },
    ),
    workflowDefinitionId: text("workflow_definition_id").references(() => methodologyWorkflows.id, {
      onDelete: "set null",
    }),
    workflowExecutionId: text("workflow_execution_id").references(() => workflowExecutions.id, {
      onDelete: "set null",
    }),
    resolutionOrder: integer("resolution_order"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("invoke_work_unit_target_execution_root_idx").on(
      table.invokeStepExecutionStateId,
      table.createdAt,
      table.id,
    ),
    index("invoke_work_unit_target_execution_project_work_unit_idx").on(table.projectWorkUnitId),
    index("invoke_work_unit_target_execution_definition_idx").on(table.workUnitDefinitionId),
    index("invoke_work_unit_target_execution_transition_definition_idx").on(
      table.transitionDefinitionId,
    ),
    index("invoke_work_unit_target_execution_transition_execution_idx").on(
      table.transitionExecutionId,
    ),
    index("invoke_work_unit_target_execution_workflow_definition_idx").on(
      table.workflowDefinitionId,
    ),
    index("invoke_work_unit_target_execution_workflow_execution_idx").on(table.workflowExecutionId),
  ],
);

export const invokeWorkUnitCreatedFactInstance = sqliteTable(
  "invoke_work_unit_created_fact_instance",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invokeWorkUnitTargetExecutionId: text("invoke_work_unit_target_execution_id")
      .notNull()
      .references(() => invokeWorkUnitTargetExecution.id, { onDelete: "cascade" }),
    factDefinitionId: text("fact_definition_id")
      .notNull()
      .references(() => workUnitFactDefinitions.id, { onDelete: "restrict" }),
    workUnitFactInstanceId: text("work_unit_fact_instance_id")
      .notNull()
      .references(() => workUnitFactInstances.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("invoke_work_unit_created_fact_instance_target_idx").on(
      table.invokeWorkUnitTargetExecutionId,
      table.createdAt,
      table.id,
    ),
    index("invoke_work_unit_created_fact_instance_definition_idx").on(table.factDefinitionId),
    index("invoke_work_unit_created_fact_instance_instance_idx").on(table.workUnitFactInstanceId),
  ],
);

export const invokeWorkUnitCreatedArtifactSnapshot = sqliteTable(
  "invoke_work_unit_created_artifact_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invokeWorkUnitTargetExecutionId: text("invoke_work_unit_target_execution_id")
      .notNull()
      .references(() => invokeWorkUnitTargetExecution.id, { onDelete: "cascade" }),
    artifactSlotDefinitionId: text("artifact_slot_definition_id")
      .notNull()
      .references(() => methodologyArtifactSlotDefinitions.id, { onDelete: "restrict" }),
    artifactSnapshotId: text("artifact_snapshot_id")
      .notNull()
      .references(() => projectArtifactSnapshots.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("invoke_work_unit_created_artifact_snapshot_target_idx").on(
      table.invokeWorkUnitTargetExecutionId,
      table.createdAt,
      table.id,
    ),
    index("invoke_work_unit_created_artifact_snapshot_slot_idx").on(table.artifactSlotDefinitionId),
    index("invoke_work_unit_created_artifact_snapshot_snapshot_idx").on(table.artifactSnapshotId),
  ],
);

export const formStepExecutionState = sqliteTable(
  "form_step_execution_state",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    draftPayloadJson: text("draft_payload_json", { mode: "json" }),
    submittedPayloadJson: text("submitted_payload_json", { mode: "json" }),
    lastDraftSavedAt: integer("last_draft_saved_at", { mode: "timestamp_ms" }),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  },
  (table) => [uniqueIndex("form_step_execution_state_step_idx").on(table.stepExecutionId)],
);

export const agentStepExecutionState = sqliteTable(
  "agent_step_execution_state",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    state: text("state", { enum: AGENT_STEP_RUNTIME_STATES }).notNull().default("not_started"),
    bootstrapAppliedAt: integer("bootstrap_applied_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("agent_step_execution_state_step_idx").on(table.stepExecutionId),
    index("agent_step_execution_state_state_idx").on(table.state),
  ],
);

export const agentStepExecutionHarnessBinding = sqliteTable(
  "agent_step_execution_harness_binding",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    harnessId: text("harness_id").notNull().default("opencode"),
    bindingState: text("binding_state", { enum: agentStepHarnessBindingStates })
      .notNull()
      .default("unbound"),
    sessionId: text("session_id"),
    serverInstanceId: text("server_instance_id"),
    serverBaseUrl: text("server_base_url"),
    selectedAgentKey: text("selected_agent_key"),
    selectedModelJson: text("selected_model_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("agent_step_execution_harness_binding_step_idx").on(table.stepExecutionId),
    index("agent_step_execution_harness_binding_state_idx").on(table.bindingState),
    index("agent_step_execution_harness_binding_session_idx").on(table.sessionId),
  ],
);

export const agentStepExecutionAppliedWrites = sqliteTable(
  "agent_step_execution_applied_writes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    writeItemId: text("write_item_id").notNull(),
    contextFactDefinitionId: text("context_fact_definition_id").notNull(),
    contextFactKind: text("context_fact_kind", { enum: WORKFLOW_CONTEXT_FACT_KINDS }).notNull(),
    instanceOrder: integer("instance_order").notNull(),
    appliedValueJson: text("applied_value_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("agent_step_execution_applied_writes_step_idx").on(
      table.stepExecutionId,
      table.createdAt,
      table.id,
    ),
    index("agent_step_execution_applied_writes_fact_idx").on(table.contextFactDefinitionId),
    index("agent_step_execution_applied_writes_write_item_idx").on(table.writeItemId),
  ],
);

export const workflowExecutionContextFacts = sqliteTable(
  "workflow_execution_context_facts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workflowExecutionId: text("workflow_execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    contextFactDefinitionId: text("context_fact_definition_id")
      .notNull()
      .references(() => methodologyWorkflowContextFactDefinitions.id, { onDelete: "restrict" }),
    instanceOrder: integer("instance_order").notNull(),
    valueJson: text("value_json", { mode: "json" }),
    sourceStepExecutionId: text("source_step_execution_id").references(() => stepExecutions.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("workflow_execution_context_facts_workflow_idx").on(table.workflowExecutionId),
    uniqueIndex("workflow_execution_context_facts_definition_instance_idx").on(
      table.workflowExecutionId,
      table.contextFactDefinitionId,
      table.instanceOrder,
    ),
    index("workflow_execution_context_facts_source_step_idx").on(table.sourceStepExecutionId),
  ],
);
