ALTER TABLE `projects` ADD `project_root_path` text;--> statement-breakpoint
CREATE TABLE `project_work_units` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`work_unit_type_id` text NOT NULL,
	`current_state_id` text NOT NULL,
	`active_transition_execution_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_unit_type_id`) REFERENCES `methodology_work_unit_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`current_state_id`) REFERENCES `work_unit_lifecycle_states`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `project_work_units_project_idx` ON `project_work_units` (`project_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `project_work_units_type_idx` ON `project_work_units` (`work_unit_type_id`);--> statement-breakpoint
CREATE INDEX `project_work_units_current_state_idx` ON `project_work_units` (`current_state_id`);--> statement-breakpoint
CREATE INDEX `project_work_units_active_transition_idx` ON `project_work_units` (`active_transition_execution_id`);--> statement-breakpoint
CREATE TABLE `transition_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_work_unit_id` text NOT NULL,
	`transition_id` text NOT NULL,
	`status` text NOT NULL,
	`primary_workflow_execution_id` text,
	`superseded_by_transition_execution_id` text,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`superseded_at` integer,
	FOREIGN KEY (`project_work_unit_id`) REFERENCES `project_work_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transition_id`) REFERENCES `work_unit_lifecycle_transitions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`superseded_by_transition_execution_id`) REFERENCES `transition_executions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transition_execs_work_unit_idx` ON `transition_executions` (`project_work_unit_id`,`started_at`,`id`);--> statement-breakpoint
CREATE INDEX `transition_execs_transition_idx` ON `transition_executions` (`transition_id`);--> statement-breakpoint
CREATE INDEX `transition_execs_status_idx` ON `transition_executions` (`status`);--> statement-breakpoint
CREATE INDEX `transition_execs_primary_workflow_idx` ON `transition_executions` (`primary_workflow_execution_id`);--> statement-breakpoint
CREATE INDEX `transition_execs_superseded_by_idx` ON `transition_executions` (`superseded_by_transition_execution_id`);--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`transition_execution_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`workflow_role` text NOT NULL,
	`status` text NOT NULL,
	`superseded_by_workflow_execution_id` text,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`superseded_at` integer,
	FOREIGN KEY (`transition_execution_id`) REFERENCES `transition_executions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `methodology_workflows`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`superseded_by_workflow_execution_id`) REFERENCES `workflow_executions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workflow_execs_transition_idx` ON `workflow_executions` (`transition_execution_id`,`started_at`,`id`);--> statement-breakpoint
CREATE INDEX `workflow_execs_workflow_idx` ON `workflow_executions` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `workflow_execs_role_idx` ON `workflow_executions` (`workflow_role`);--> statement-breakpoint
CREATE INDEX `workflow_execs_status_idx` ON `workflow_executions` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_execs_superseded_by_idx` ON `workflow_executions` (`superseded_by_workflow_execution_id`);--> statement-breakpoint
CREATE TABLE `project_fact_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`fact_definition_id` text NOT NULL,
	`value_json` text,
	`status` text NOT NULL,
	`superseded_by_fact_instance_id` text,
	`produced_by_transition_execution_id` text,
	`produced_by_workflow_execution_id` text,
	`authored_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fact_definition_id`) REFERENCES `methodology_fact_definitions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`superseded_by_fact_instance_id`) REFERENCES `project_fact_instances`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`produced_by_transition_execution_id`) REFERENCES `transition_executions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`produced_by_workflow_execution_id`) REFERENCES `workflow_executions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_fact_instances_project_idx` ON `project_fact_instances` (`project_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `project_fact_instances_definition_idx` ON `project_fact_instances` (`fact_definition_id`);--> statement-breakpoint
CREATE INDEX `project_fact_instances_status_idx` ON `project_fact_instances` (`status`);--> statement-breakpoint
CREATE INDEX `project_fact_instances_superseded_by_idx` ON `project_fact_instances` (`superseded_by_fact_instance_id`);--> statement-breakpoint
CREATE INDEX `project_fact_instances_transition_idx` ON `project_fact_instances` (`produced_by_transition_execution_id`);--> statement-breakpoint
CREATE INDEX `project_fact_instances_workflow_idx` ON `project_fact_instances` (`produced_by_workflow_execution_id`);--> statement-breakpoint
CREATE TABLE `work_unit_fact_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`project_work_unit_id` text NOT NULL,
	`fact_definition_id` text NOT NULL,
	`value_json` text,
	`referenced_project_work_unit_id` text,
	`status` text NOT NULL,
	`superseded_by_fact_instance_id` text,
	`produced_by_transition_execution_id` text,
	`produced_by_workflow_execution_id` text,
	`authored_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_work_unit_id`) REFERENCES `project_work_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fact_definition_id`) REFERENCES `work_unit_fact_definitions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`referenced_project_work_unit_id`) REFERENCES `project_work_units`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`superseded_by_fact_instance_id`) REFERENCES `work_unit_fact_instances`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`produced_by_transition_execution_id`) REFERENCES `transition_executions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`produced_by_workflow_execution_id`) REFERENCES `workflow_executions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_work_unit_idx` ON `work_unit_fact_instances` (`project_work_unit_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_definition_idx` ON `work_unit_fact_instances` (`fact_definition_id`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_referenced_wu_idx` ON `work_unit_fact_instances` (`referenced_project_work_unit_id`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_status_idx` ON `work_unit_fact_instances` (`status`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_superseded_by_idx` ON `work_unit_fact_instances` (`superseded_by_fact_instance_id`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_transition_idx` ON `work_unit_fact_instances` (`produced_by_transition_execution_id`);--> statement-breakpoint
CREATE INDEX `work_unit_fact_instances_workflow_idx` ON `work_unit_fact_instances` (`produced_by_workflow_execution_id`);--> statement-breakpoint
CREATE TABLE `project_artifact_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_work_unit_id` text NOT NULL,
	`slot_definition_id` text NOT NULL,
	`recorded_by_transition_execution_id` text,
	`recorded_by_workflow_execution_id` text,
	`recorded_by_user_id` text,
	`superseded_by_project_artifact_snapshot_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_work_unit_id`) REFERENCES `project_work_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_definition_id`) REFERENCES `methodology_artifact_slot_definitions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by_transition_execution_id`) REFERENCES `transition_executions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recorded_by_workflow_execution_id`) REFERENCES `workflow_executions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`superseded_by_project_artifact_snapshot_id`) REFERENCES `project_artifact_snapshots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_artifact_snapshots_work_unit_idx` ON `project_artifact_snapshots` (`project_work_unit_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `project_artifact_snapshots_slot_idx` ON `project_artifact_snapshots` (`slot_definition_id`);--> statement-breakpoint
CREATE INDEX `project_artifact_snapshots_transition_idx` ON `project_artifact_snapshots` (`recorded_by_transition_execution_id`);--> statement-breakpoint
CREATE INDEX `project_artifact_snapshots_workflow_idx` ON `project_artifact_snapshots` (`recorded_by_workflow_execution_id`);--> statement-breakpoint
CREATE INDEX `project_artifact_snapshots_superseded_by_idx` ON `project_artifact_snapshots` (`superseded_by_project_artifact_snapshot_id`);--> statement-breakpoint
CREATE TABLE `artifact_snapshot_files` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_snapshot_id` text NOT NULL,
	`file_path` text NOT NULL,
	`member_status` text NOT NULL,
	`git_commit_hash` text,
	`git_blob_hash` text,
	FOREIGN KEY (`artifact_snapshot_id`) REFERENCES `project_artifact_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifact_snapshot_files_snapshot_idx` ON `artifact_snapshot_files` (`artifact_snapshot_id`);--> statement-breakpoint
CREATE INDEX `artifact_snapshot_files_snapshot_path_idx` ON `artifact_snapshot_files` (`artifact_snapshot_id`,`file_path`);--> statement-breakpoint
CREATE INDEX `artifact_snapshot_files_member_status_idx` ON `artifact_snapshot_files` (`member_status`);
