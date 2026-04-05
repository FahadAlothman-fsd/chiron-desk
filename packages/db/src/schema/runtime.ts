import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import {
  methodologyArtifactSlotDefinitions,
  methodologyFactDefinitions,
  methodologyWorkflowSteps,
  methodologyWorkUnitTypes,
  workUnitFactDefinitions,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
  methodologyWorkflows,
} from "./methodology";
import { projects } from "./project";

const timestampDefault = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

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
    progressionData: text("progression_data", { mode: "json" }),
  },
  (table) => [
    index("step_executions_workflow_idx").on(
      table.workflowExecutionId,
      table.activatedAt,
      table.id,
    ),
    index("step_executions_step_definition_idx").on(table.stepDefinitionId),
    index("step_executions_status_idx").on(table.status),
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
    draftValuesJson: text("draft_values_json", { mode: "json" }),
    submittedSnapshotJson: text("submitted_snapshot_json", { mode: "json" }),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("form_step_execution_state_step_idx").on(table.stepExecutionId)],
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
    factKey: text("fact_key").notNull(),
    factKind: text("fact_kind").notNull(),
    valueJson: text("value_json", { mode: "json" }),
    sourceStepExecutionId: text("source_step_execution_id").references(() => stepExecutions.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("workflow_execution_context_facts_workflow_idx").on(table.workflowExecutionId),
    index("workflow_execution_context_facts_key_kind_idx").on(
      table.workflowExecutionId,
      table.factKey,
      table.factKind,
    ),
    index("workflow_execution_context_facts_source_step_idx").on(table.sourceStepExecutionId),
  ],
);
