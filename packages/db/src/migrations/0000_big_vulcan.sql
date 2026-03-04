CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `methodology_agent_types` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`key` text NOT NULL,
	`display_name` text,
	`description` text,
	`persona` text NOT NULL,
	`default_model_json` text,
	`mcp_servers_json` text,
	`capabilities_json` text,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_at_vid_key_idx` ON `methodology_agent_types` (`methodology_version_id`,`key`);--> statement-breakpoint
CREATE TABLE `methodology_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_definitions_key_idx` ON `methodology_definitions` (`key`);--> statement-breakpoint
CREATE TABLE `methodology_fact_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`name` text,
	`key` text NOT NULL,
	`value_type` text NOT NULL,
	`description_json` text,
	`guidance_json` text,
	`required` integer DEFAULT false NOT NULL,
	`default_value_json` text,
	`validation_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_fact_defs_vid_key_idx` ON `methodology_fact_definitions` (`methodology_version_id`,`key`);--> statement-breakpoint
CREATE TABLE `methodology_fact_schemas` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`work_unit_type_id` text NOT NULL,
	`name` text,
	`key` text NOT NULL,
	`fact_type` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`description` text,
	`default_value_json` text,
	`guidance_json` text,
	`validation_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_unit_type_id`) REFERENCES `methodology_work_unit_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_fs_vid_wut_key_idx` ON `methodology_fact_schemas` (`methodology_version_id`,`work_unit_type_id`,`key`);--> statement-breakpoint
CREATE INDEX `methodology_fs_vid_wut_idx` ON `methodology_fact_schemas` (`methodology_version_id`,`work_unit_type_id`);--> statement-breakpoint
CREATE TABLE `methodology_lifecycle_states` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`work_unit_type_id` text NOT NULL,
	`key` text NOT NULL,
	`display_name` text,
	`description_json` text,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_unit_type_id`) REFERENCES `methodology_work_unit_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_ls_vid_wut_key_idx` ON `methodology_lifecycle_states` (`methodology_version_id`,`work_unit_type_id`,`key`);--> statement-breakpoint
CREATE INDEX `methodology_ls_vid_wut_idx` ON `methodology_lifecycle_states` (`methodology_version_id`,`work_unit_type_id`);--> statement-breakpoint
CREATE TABLE `methodology_lifecycle_transitions` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`work_unit_type_id` text NOT NULL,
	`from_state_id` text,
	`to_state_id` text NOT NULL,
	`transition_key` text NOT NULL,
	`gate_class` text NOT NULL,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_unit_type_id`) REFERENCES `methodology_work_unit_types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_state_id`) REFERENCES `methodology_lifecycle_states`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_state_id`) REFERENCES `methodology_lifecycle_states`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_lt_vid_wut_key_idx` ON `methodology_lifecycle_transitions` (`methodology_version_id`,`work_unit_type_id`,`transition_key`);--> statement-breakpoint
CREATE INDEX `methodology_lt_vid_wut_idx` ON `methodology_lifecycle_transitions` (`methodology_version_id`,`work_unit_type_id`);--> statement-breakpoint
CREATE INDEX `methodology_lt_from_state_idx` ON `methodology_lifecycle_transitions` (`from_state_id`);--> statement-breakpoint
CREATE INDEX `methodology_lt_to_state_idx` ON `methodology_lifecycle_transitions` (`to_state_id`);--> statement-breakpoint
CREATE TABLE `methodology_link_type_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`key` text NOT NULL,
	`description_json` text,
	`allowed_strengths_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_link_type_defs_vid_key_idx` ON `methodology_link_type_definitions` (`methodology_version_id`,`key`);--> statement-breakpoint
CREATE TABLE `methodology_transition_required_links` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`transition_id` text NOT NULL,
	`link_type_key` text NOT NULL,
	`strength` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transition_id`) REFERENCES `methodology_lifecycle_transitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_trl_vid_trans_link_idx` ON `methodology_transition_required_links` (`methodology_version_id`,`transition_id`,`link_type_key`);--> statement-breakpoint
CREATE INDEX `methodology_trl_vid_trans_idx` ON `methodology_transition_required_links` (`methodology_version_id`,`transition_id`);--> statement-breakpoint
CREATE TABLE `methodology_transition_workflow_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`transition_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transition_id`) REFERENCES `methodology_lifecycle_transitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `methodology_workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_twb_vid_transition_workflow_idx` ON `methodology_transition_workflow_bindings` (`methodology_version_id`,`transition_id`,`workflow_id`);--> statement-breakpoint
CREATE INDEX `methodology_twb_vid_transition_idx` ON `methodology_transition_workflow_bindings` (`methodology_version_id`,`transition_id`);--> statement-breakpoint
CREATE TABLE `methodology_version_events` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text,
	`changed_fields_json` text,
	`diagnostics_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `methodology_version_events_lineage_idx` ON `methodology_version_events` (`methodology_version_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `methodology_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_id` text NOT NULL,
	`version` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`display_name` text NOT NULL,
	`definition_extensions_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`retired_at` integer,
	FOREIGN KEY (`methodology_id`) REFERENCES `methodology_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_versions_mid_ver_idx` ON `methodology_versions` (`methodology_id`,`version`);--> statement-breakpoint
CREATE INDEX `methodology_versions_mid_status_idx` ON `methodology_versions` (`methodology_id`,`status`);--> statement-breakpoint
CREATE TABLE `methodology_work_unit_types` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`key` text NOT NULL,
	`display_name` text,
	`description_json` text,
	`guidance_json` text,
	`cardinality` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_wut_vid_key_idx` ON `methodology_work_unit_types` (`methodology_version_id`,`key`);--> statement-breakpoint
CREATE TABLE `methodology_workflow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`from_step_id` text,
	`to_step_id` text,
	`edge_key` text,
	`condition_json` text,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `methodology_workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_step_id`) REFERENCES `methodology_workflow_steps`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_step_id`) REFERENCES `methodology_workflow_steps`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `methodology_workflow_edges_vid_wid_idx` ON `methodology_workflow_edges` (`methodology_version_id`,`workflow_id`);--> statement-breakpoint
CREATE INDEX `methodology_workflow_edges_from_step_idx` ON `methodology_workflow_edges` (`from_step_id`);--> statement-breakpoint
CREATE INDEX `methodology_workflow_edges_to_step_idx` ON `methodology_workflow_edges` (`to_step_id`);--> statement-breakpoint
CREATE TABLE `methodology_workflow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`display_name` text,
	`config_json` text,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `methodology_workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_workflow_steps_wid_key_idx` ON `methodology_workflow_steps` (`workflow_id`,`key`);--> statement-breakpoint
CREATE INDEX `methodology_workflow_steps_vid_wid_idx` ON `methodology_workflow_steps` (`methodology_version_id`,`workflow_id`);--> statement-breakpoint
CREATE TABLE `methodology_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`work_unit_type_id` text,
	`key` text NOT NULL,
	`display_name` text,
	`guidance_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_unit_type_id`) REFERENCES `methodology_work_unit_types`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `methodology_workflows_vid_key_idx` ON `methodology_workflows` (`methodology_version_id`,`key`);--> statement-breakpoint
CREATE INDEX `methodology_workflows_vid_wut_idx` ON `methodology_workflows` (`methodology_version_id`,`work_unit_type_id`);--> statement-breakpoint
CREATE TABLE `project_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`methodology_version_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `project_executions_project_idx` ON `project_executions` (`project_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `project_methodology_pin_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text,
	`previous_version` text,
	`new_version` text NOT NULL,
	`evidence_ref` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_methodology_pin_events_lineage_idx` ON `project_methodology_pin_events` (`project_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `project_methodology_pins` (
	`project_id` text PRIMARY KEY NOT NULL,
	`methodology_version_id` text NOT NULL,
	`methodology_id` text NOT NULL,
	`methodology_key` text NOT NULL,
	`published_version` text NOT NULL,
	`actor_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`methodology_version_id`) REFERENCES `methodology_versions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `project_methodology_pins_version_idx` ON `project_methodology_pins` (`methodology_version_id`);--> statement-breakpoint
CREATE INDEX `project_methodology_pins_methodology_idx` ON `project_methodology_pins` (`methodology_id`,`methodology_key`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
