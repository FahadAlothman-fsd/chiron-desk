import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

type JsonMap = Record<string, unknown>;

const idCol = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAtCol = () => integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());
const updatedAtCol = () => integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());


export const user = sqliteTable("user", {
  /**
   * Table `user`
   * Purpose: Better-Auth user identity record.
   * Fields:
   * - id: auth user id.
   * - name: display name.
   * - email: unique login email.
   * - emailVerified: whether email is verified.
   * - image: avatar URL/path.
   * - createdAt: creation timestamp.
   * - updatedAt: last update timestamp.
   */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    /**
     * Table `session`
     * Purpose: Better-Auth session/token lifecycle.
     * Fields:
     * - id: session id.
     * - expiresAt: token expiry time.
     * - token: unique session token.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     * - ipAddress: originating IP.
     * - userAgent: client user-agent.
     * - userId: owning user.
     */
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    /**
     * Table `account`
     * Purpose: Better-Auth provider account binding.
     * Fields:
     * - id: account row id.
     * - accountId: provider account identifier.
     * - providerId: auth provider key.
     * - userId: owning user.
     * - accessToken: provider access token.
     * - refreshToken: provider refresh token.
     * - idToken: provider ID token.
     * - accessTokenExpiresAt: access token expiry.
     * - refreshTokenExpiresAt: refresh token expiry.
     * - scope: provider scope string.
     * - password: credential hash for password providers.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable("verification", {
  /**
   * Table `verification`
   * Purpose: Better-Auth one-time verification entries.
   * Fields:
   * - id: verification id.
   * - identifier: target identifier (email/phone).
   * - value: verification value/token.
   * - expiresAt: expiration timestamp.
   * - createdAt: creation timestamp.
   * - updatedAt: update timestamp.
   */
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});


export const projects = sqliteTable(
  "projects",
  {
    /**
     * Table `projects`
     * Purpose: project root metadata and ownership.
     * Fields:
     * - id: project id.
     * - name: project name.
     * - description: optional project summary.
     * - path: local repo/workspace path.
     * - status: project lifecycle status.
     * - userId: owning user.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    name: text("name").notNull(),
    description: text("description"),
    path: text("path").notNull(),
    status: text("status").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("projects_status_idx").on(table.status)],
);

export const methodologyDefinitions = sqliteTable(
  "methodology_definitions",
  {
    /**
     * Table `methodology_definitions`
     * Purpose: methodology identity (stable key across versions).
     * Fields:
     * - id: methodology id.
     * - key: unique methodology key.
     * - name: display name.
     * - descriptionJson: long/short/agent descriptions.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>().notNull(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("methodology_definitions_key_uq").on(table.key)],
);

export const methodologyVersions = sqliteTable(
  "methodology_versions",
  {
    /**
     * Table `methodology_versions`
     * Purpose: immutable version snapshots for a methodology.
     * Fields:
     * - id: methodology version id.
     * - methodologyId: parent methodology.
     * - version: semantic version string.
     * - status: draft/active/deprecated/retired status.
     * - upgradePolicy: upgrade strategy hint.
     * - minSupportedFromVersion: oldest upgradable version.
     * - definitionJson: frozen version bundle metadata.
     * - createdAt: creation timestamp.
     * - retiredAt: retirement timestamp.
     */
    id: idCol(),
    methodologyId: text("methodology_id")
      .notNull()
      .references(() => methodologyDefinitions.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    status: text("status").notNull(),
    upgradePolicy: text("upgrade_policy").notNull(),
    minSupportedFromVersion: text("min_supported_from_version"),
    definitionJson: text("definition_json", { mode: "json" }).$type<JsonMap>().notNull(),
    createdAt: createdAtCol(),
    retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("methodology_versions_unique_idx").on(table.methodologyId, table.version),
    index("methodology_versions_status_idx").on(table.methodologyId, table.status),
  ],
);

export const projectMethodologyPins = sqliteTable(
  "project_methodology_pins",
  {
    // TODO: I think that we should discuss this later... cuz its nice and it might help with upgrading a methodology...
    // but there's a lot of moving parts with this:
    // - how to carry over stuff from a work unit type's previous version and the current version
    // - workflow executions are linked to the work unit type which is linked to the method version so how will it work with upgrading and like linking it and showing the user the upgraded version
    // - snapshots
    // - basically everything thats connected to a work unit type will have the same issue
    //
    /**
     * Table `project_methodology_pins`
     * Purpose: project-to-methodology-version pin history.
     * Fields:
     * - id: pin record id.
     * - projectId: pinned project.
     * - methodologyVersionId: selected methodology version.
     * - upgradeFromPinId: previous pin record when upgraded.
     * - pinnedByUserId: actor who pinned/upgraded.
     * - notesJson: optional upgrade notes.
     * - pinnedAt: pin timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "restrict" }),
    upgradeFromPinId: text("upgrade_from_pin_id"),
    pinnedByUserId: text("pinned_by_user_id").references(() => user.id, { onDelete: "set null" }),
    notesJson: text("notes_json", { mode: "json" }).$type<JsonMap>(),
    pinnedAt: integer("pinned_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("project_methodology_pins_project_idx").on(table.projectId, table.pinnedAt)],
);


export const methodologyVariableDefinitions = sqliteTable(
  "methodology_variable_definitions",
  {
    /**
     * Table `methodology_variable_definitions`
     * Purpose: allowed variable/fact definitions per methodology version.
     * Fields:
     * - id: variable definition id.
     * - methodologyVersionId: owning methodology version.
     * - key: variable key.
     * - valueType: declared primitive/structured type marker.
     * - scope: project/work_unit/execution scope.
     * - descriptionJson: human + agent description payload.
     * - required: whether value is required.
     * - defaultValueJson: optional default value.
     * - validationJson: extra validation constraints.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueType: text("value_type").notNull(),
    scope: text("scope").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>().notNull(),
    required: integer("required", { mode: "boolean" }).notNull().default(false),
    defaultValueJson: text("default_value_json", { mode: "json" }).$type<JsonMap>(),
    validationJson: text("validation_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("methodology_variable_definitions_unique_idx").on(table.methodologyVersionId, table.key),
    index("methodology_variable_definitions_scope_idx").on(table.methodologyVersionId, table.scope),
  ],
);

export const projectVariableValues = sqliteTable(
  "project_variable_values",
  {
    /**
     * Table `project_variable_values`
     * Purpose: current value store for methodology-defined project variables.
     * Fields:
     * - id: current-value row id.
     * - projectId: project owner.
     * - methodologyVariableDefinitionId: variable definition reference.
     * - valueJson: current value payload.
     * - source: update source classification.
     * - updatedByExecutionId: execution that updated value.
     * - updatedByStepExecutionId: step that updated value.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVariableDefinitionId: text("methodology_variable_definition_id")
      .notNull()
      .references(() => methodologyVariableDefinitions.id, { onDelete: "cascade" }),
    valueJson: text("value_json", { mode: "json" }).$type<JsonMap>().notNull(),
    source: text("source").notNull(),
    updatedByExecutionId: text("updated_by_execution_id"),
    updatedByStepExecutionId: text("updated_by_step_execution_id"),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("project_variable_values_unique_idx").on(table.projectId, table.methodologyVariableDefinitionId),
    index("project_variable_values_project_idx").on(table.projectId),
  ],
);

export const projectVariableHistory = sqliteTable(
  "project_variable_history",
  {
    // TODO: i think this will be a bit too overengineering... we need to think about this later but its a good starting point
    /**
     * Table `project_variable_history`
     * Purpose: append-only history for project variable changes.
     * Fields:
     * - id: history row id.
     * - projectId: project owner.
     * - methodologyVariableDefinitionId: variable definition reference.
     * - previousValueJson: value before change.
     * - newValueJson: value after change.
     * - source: change source classification.
     * - changedByExecutionId: execution that made change.
     * - changedByStepExecutionId: step that made change.
     * - changedAt: mutation timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVariableDefinitionId: text("methodology_variable_definition_id")
      .notNull()
      .references(() => methodologyVariableDefinitions.id, { onDelete: "cascade" }),
    previousValueJson: text("previous_value_json", { mode: "json" }).$type<JsonMap>(),
    newValueJson: text("new_value_json", { mode: "json" }).$type<JsonMap>().notNull(),
    source: text("source").notNull(),
    changedByExecutionId: text("changed_by_execution_id"),
    changedByStepExecutionId: text("changed_by_step_execution_id"),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("project_variable_history_project_idx").on(table.projectId, table.changedAt),
    index("project_variable_history_definition_idx").on(table.methodologyVariableDefinitionId, table.changedAt),
  ],
);


export const workUnitTypeDefinitions = sqliteTable(
  "work_unit_type_definitions",
  {
    // TODO: hmmm.... were are we defining the artifacts of the work unit... ya get me?
    // - we didn't really discuss them that much right?
    // - like there's definitions of artifacts and they will be used for the gate right? and they will save the snapshot as well... ya get me?
    // - so where are we defingin the artifacts of the work unit... are they in slotPolicy?
    /**
     * Table `work_unit_type_definitions`
     * Purpose: work-unit type contracts per methodology version.
     * Fields:
     * - id: work-unit type id.
     * - methodologyVersionId: owning methodology version.
     * - key: work-unit type key.
     * - name: display name.
     * - descriptionJson: type description payload.
     * - stateLedgerJson: allowed state ledger for this type.
     * - slotPolicyJson: optional slot policy defaults.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>().notNull(),
    stateLedgerJson: text("state_ledger_json", { mode: "json" }).$type<JsonMap>().notNull(),
    slotPolicyJson: text("slot_policy_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("work_unit_type_definitions_unique_idx").on(table.methodologyVersionId, table.key)],
);

export const workUnitTransitionDefinitions = sqliteTable(
  "work_unit_transition_definitions",
  {
    // TODO: when we define the json structures... can we enforce them at the db level... 
    // - like here i mean instaed of JSONMap its going to to be like the actual schema of the field... like we expect some structure to it ya get me?
    // - transitionPolicy should be part of the gate... right? cuz each one will have its policy... ya get me? of what are the conditions that are required and the ones optional
    /**
     * Table `work_unit_transition_definitions`
     * Purpose: state transition edges for a work-unit type.
     * Fields:
     * - id: transition definition id.
     * - methodologyVersionId: owning methodology version.
     * - workUnitTypeId: owning work-unit type.
     * - fromState: source state (may include reserved activation state).
     * - toState: target state.
     * - transitionKey: stable transition key.
     * - startGateRequirementsJson: start-gate requirements payload.
     * - completionGateRequirementsJson: completion-gate requirements payload.
     * - transitionPolicyJson: optional transition policy payload.
     * - enabled: whether transition is active.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => workUnitTypeDefinitions.id, { onDelete: "cascade" }),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    transitionKey: text("transition_key").notNull(),
    startGateRequirementsJson: text("start_gate_requirements_json", { mode: "json" })
      .$type<JsonMap>()
      .notNull(),
    completionGateRequirementsJson: text("completion_gate_requirements_json", { mode: "json" })
      .$type<JsonMap>()
      .notNull(),
    transitionPolicyJson: text("transition_policy_json", { mode: "json" }).$type<JsonMap>(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("work_unit_transition_definitions_unique_idx").on(
      table.methodologyVersionId,
      table.workUnitTypeId,
      table.fromState,
      table.toState,
    ),
    index("work_unit_transition_definitions_lookup_idx").on(table.methodologyVersionId, table.workUnitTypeId),
  ],
);

export const workflowDefinitions = sqliteTable(
  "workflow_definitions",
  {
    /**
     * Table `workflow_definitions`
     * Purpose: reusable workflow definitions scoped to work-unit type and methodology version.
     * Fields:
     * - id: workflow definition id.
     * - methodologyVersionId: owning methodology version.
     * - ownerWorkUnitTypeId: owning work-unit type.
     * - key: stable workflow key.
     * - name: display name.
     * - descriptionJson: workflow description payload.
     * - definitionJson: full workflow step/config definition.
     * - metadataJson: extra filter/search metadata.
     * - enabled: whether workflow is selectable/runnable.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    ownerWorkUnitTypeId: text("owner_work_unit_type_id")
      .notNull()
      .references(() => workUnitTypeDefinitions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>().notNull(),
    definitionJson: text("definition_json", { mode: "json" }).$type<JsonMap>().notNull(),
    metadataJson: text("metadata_json", { mode: "json" }).$type<JsonMap>(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("workflow_definitions_unique_idx").on(table.methodologyVersionId, table.key),
    index("workflow_definitions_owner_idx").on(table.methodologyVersionId, table.ownerWorkUnitTypeId, table.enabled),
  ],
);

export const transitionAllowedWorkflows = sqliteTable(
  "transition_allowed_workflows",
  {
    // TODO: nice `bindingDefaultsJson` i think well get good usage out of it
    /**
     * Table `transition_allowed_workflows`
     * Purpose: source-of-truth mapping of workflows allowed for a transition.
     * Fields:
     * - id: mapping row id.
     * - transitionDefinitionId: transition edge reference.
     * - workflowDefinitionId: allowed workflow reference.
     * - priority: ordering hint for UI/selection.
     * - enabled: whether this mapping is active.
     * - bindingDefaultsJson: optional invoke/selection defaults.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    transitionDefinitionId: text("transition_definition_id")
      .notNull()
      .references(() => workUnitTransitionDefinitions.id, { onDelete: "cascade" }),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    priority: integer("priority"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    bindingDefaultsJson: text("binding_defaults_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("transition_allowed_workflows_unique_idx").on(table.transitionDefinitionId, table.workflowDefinitionId),
    index("transition_allowed_workflows_lookup_idx").on(table.transitionDefinitionId, table.enabled, table.priority),
  ],
);


export const workUnits = sqliteTable(
  "work_units",
  {
    // TODO: should we have the state as a text or like it references something that stores the state related stuff (so snapshot, etc)
    // - cuz it has to link to the state ledger right? in the work unit... like we need to find a way to do that
    /**
     * Table `work_units`
     * Purpose: runtime/planning instances of work-unit types.
     * Fields:
     * - id: work-unit instance id.
     * - projectId: owning project.
     * - methodologyVersionId: pinned methodology version.
     * - workUnitTypeId: work-unit type definition reference.
     * - key: project-unique work-unit key.
     * - title: display title.
     * - objective: optional objective text.
     * - state: current state in state machine.
     * - priority: optional ordering priority.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "restrict" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => workUnitTypeDefinitions.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    objective: text("objective"),
    state: text("state").notNull(),
    priority: integer("priority"),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("work_units_project_key_uq").on(table.projectId, table.key),
    index("work_units_state_idx").on(table.projectId, table.workUnitTypeId, table.state),
  ],
);

export const methodologyLinkTypeDefinitions = sqliteTable(
  "methodology_link_type_definitions",
  {
    // TODO: hmmm.... we check this out later... but we might do the same thing we did with the state (defining it at the work unit level) 
    /**
     * Table `methodology_link_type_definitions`
     * Purpose: allowed link/dependency type ledger per methodology version.
     * Fields:
     * - id: link-type definition id.
     * - methodologyVersionId: owning methodology version.
     * - key: link type key (for example depends_on).
     * - descriptionJson: long/short/agent semantics.
     * - allowedStrengthsJson: allowed strengths (hard/soft/context).
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>().notNull(),
    allowedStrengthsJson: text("allowed_strengths_json", { mode: "json" }).$type<JsonMap>().notNull(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("methodology_link_type_definitions_unique_idx").on(table.methodologyVersionId, table.key)],
);

export const workUnitLinks = sqliteTable(
  "work_unit_links",
  {
    /**
     * Table `work_unit_links`
     * Purpose: actual graph edges between work-unit instances.
     * Fields:
     * - id: link row id.
     * - projectId: owning project.
     * - sourceWorkUnitId: source node work-unit id.
     * - targetWorkUnitId: target node work-unit id.
     * - linkTypeDefinitionId: methodology link-type reference.
     * - strength: effective dependency strength.
     * - metaJson: context payload for this link.
     * - createdByExecutionId: execution that created/updated link.
     * - createdByStepExecutionId: step that created/updated link.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceWorkUnitId: text("source_work_unit_id")
      .notNull()
      .references(() => workUnits.id, { onDelete: "cascade" }),
    targetWorkUnitId: text("target_work_unit_id")
      .notNull()
      .references(() => workUnits.id, { onDelete: "cascade" }),
    linkTypeDefinitionId: text("link_type_definition_id")
      .notNull()
      .references(() => methodologyLinkTypeDefinitions.id, { onDelete: "restrict" }),
    strength: text("strength").notNull(),
    metaJson: text("meta_json", { mode: "json" }).$type<JsonMap>(),
    createdByExecutionId: text("created_by_execution_id"),
    createdByStepExecutionId: text("created_by_step_execution_id"),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("work_unit_links_unique_idx").on(table.sourceWorkUnitId, table.targetWorkUnitId, table.linkTypeDefinitionId),
    index("work_unit_links_target_idx").on(table.projectId, table.targetWorkUnitId, table.strength),
  ],
);


export const workflows = sqliteTable(
  "workflows",
  {
    /**
     * Table `workflows`
     * Purpose: runtime workflow catalog (legacy/current execution registry).
     * Fields:
     * - id: workflow id.
     * - name: unique internal workflow name.
     * - displayName: UI-facing name.
     * - description: workflow summary text.
     * - tags: searchable tags payload.
     * - metadata: extra workflow metadata payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    tags: text("tags", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    metadata: text("metadata", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("workflows_name_uq").on(table.name),
    index("workflows_display_name_idx").on(table.displayName),
  ],
);

export const workflowSteps = sqliteTable(
  "workflow_steps",
  {
    /**
     * Table `workflow_steps`
     * Purpose: ordered step definitions for a workflow.
     * Fields:
     * - id: step id.
     * - workflowId: parent workflow id.
     * - stepNumber: step sequence number.
     * - stepType: step capability type.
     * - name: optional step name.
     * - goal: optional step goal text.
     * - config: step config JSON payload.
     * - nextStepNumber: explicit next step pointer.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    stepType: text("step_type").notNull(),
    name: text("name"),
    goal: text("goal"),
    // TODO: we need this to also be typed correctly but we'll see if its at the Effect Schema level or here....
    config: text("config", { mode: "json" }).$type<JsonMap>().notNull(),
    nextStepNumber: integer("next_step_number"),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("workflow_steps_unique_idx").on(table.workflowId, table.stepNumber),
    index("workflow_steps_workflow_idx").on(table.workflowId),
  ],
);

export const workflowExecutions = sqliteTable(
  "workflow_executions",
  {
    /**
     * Table `workflow_executions`
     * Purpose: workflow run instances and parent/child execution lineage.
     * Fields:
     * - id: execution id.
     * - workflowId: executed workflow id.
     * - projectId: owning project.
     * - methodologyVersionId: methodology version context.
     * - workUnitId: work-unit context for execution.
     * - parentExecutionId: parent execution in invoke chain.
     * - status: execution lifecycle status.
     * - currentStepNumber: currently active step number.
     * - variables: execution variable snapshot payload.
     * - executedSteps: executed step summary payload.
     * - startedAt: start timestamp.
     * - completedAt: completion timestamp.
     * - errorMessage: failure detail text.
     * - errorStep: failing step number.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    methodologyVersionId: text("methodology_version_id").references(() => methodologyVersions.id, { onDelete: "set null" }),
    workUnitId: text("work_unit_id").references(() => workUnits.id, { onDelete: "set null" }),
    parentExecutionId: text("parent_execution_id"),
    status: text("status").notNull(),
    currentStepNumber: integer("current_step_number"),
    variables: text("variables", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    executedSteps: text("executed_steps", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    // TODO: whats the user of the error message and step?
    errorMessage: text("error_message"),
    errorStep: integer("error_step"),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    index("workflow_executions_project_idx").on(table.projectId, table.status),
    index("workflow_executions_work_unit_idx").on(table.workUnitId),
    index("workflow_executions_parent_idx").on(table.parentExecutionId),
  ],
);

export const stepExecutions = sqliteTable(
  "step_executions",
  {
    /**
     * Table `step_executions`
     * Purpose: immutable step-run records with revision lineage.
     * Fields:
     * - id: step execution id.
     * - executionId: parent workflow execution id.
     * - stepId: workflow step definition id.
     * - stepNumber: step number in workflow.
     * - stepType: step capability type.
     * - status: step execution status.
     * - isActive: active revision marker.
     * - revisionOfStepExecutionId: prior step execution being revised.
     * - parentStepExecutionId: parent lineage reference.
     * - supersededByStepExecutionId: newer revision pointer.
     * - revisionReason: human/system reason for revision.
     * - variablesDelta: variable changes for this step.
     * - approvalState: approval snapshot for this step.
     * - metadata: extra runtime metadata.
     * - startedAt: start timestamp.
     * - completedAt: completion timestamp.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    executionId: text("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepId: text("step_id").references(() => workflowSteps.id, { onDelete: "set null" }),
    stepNumber: integer("step_number").notNull(),
    stepType: text("step_type").notNull(),
    status: text("status").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    revisionOfStepExecutionId: text("revision_of_step_execution_id"),
    parentStepExecutionId: text("parent_step_execution_id"),
    supersededByStepExecutionId: text("superseded_by_step_execution_id"),
    revisionReason: text("revision_reason"),
    variablesDelta: text("variables_delta", { mode: "json" }).$type<JsonMap>(),
    approvalState: text("approval_state", { mode: "json" }).$type<JsonMap>(),
    metadata: text("metadata", { mode: "json" }).$type<JsonMap>(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    index("step_executions_execution_idx").on(table.executionId, table.stepNumber),
    index("step_executions_active_idx").on(table.executionId, table.isActive),
    index("step_executions_revision_idx").on(table.revisionOfStepExecutionId),
  ],
);


export const workUnitTransitionAttempts = sqliteTable(
  "work_unit_transition_attempts",
  {
    /**
     * Table `work_unit_transition_attempts`
     * Purpose: transition attempt lifecycle tracking.
     * Fields:
     * - id: transition attempt id.
     * - projectId: owning project.
     * - workUnitId: target work-unit instance.
     * - transitionDefinitionId: transition definition reference.
     * - workflowExecutionId: execution used for this attempt.
     * - status: attempt status.
     * - startedAt: attempt start timestamp.
     * - endedAt: attempt end timestamp.
     * - metaJson: additional attempt context.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workUnitId: text("work_unit_id")
      .notNull()
      .references(() => workUnits.id, { onDelete: "cascade" }),
    transitionDefinitionId: text("transition_definition_id")
      .notNull()
      .references(() => workUnitTransitionDefinitions.id, { onDelete: "cascade" }),
    workflowExecutionId: text("workflow_execution_id").references(() => workflowExecutions.id, { onDelete: "set null" }),
    status: text("status").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    metaJson: text("meta_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    index("work_unit_transition_attempts_work_unit_idx").on(table.workUnitId, table.status),
    index("work_unit_transition_attempts_transition_idx").on(table.transitionDefinitionId, table.status),
    index("work_unit_transition_attempts_execution_idx").on(table.workflowExecutionId),
  ],
);

export const executionOutputs = sqliteTable(
  "execution_outputs",
  {
    /**
     * Table `execution_outputs`
     * Purpose: append-only evidence ledger from workflow/step execution outputs.
     * Fields:
     * - id: output row id.
     * - projectId: owning project context.
     * - workUnitId: work-unit context.
     * - workflowExecutionId: producer execution id.
     * - stepExecutionId: producer step execution id.
     * - transitionAttemptId: related transition attempt id.
     * - varKey: variable/output key.
     * - varType: typed output/evidence type.
     * - valueJson: output payload.
     * - createdAt: creation timestamp.
     */
    id: idCol(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    workUnitId: text("work_unit_id").references(() => workUnits.id, { onDelete: "set null" }),
    workflowExecutionId: text("workflow_execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepExecutionId: text("step_execution_id").references(() => stepExecutions.id, { onDelete: "set null" }),
    transitionAttemptId: text("transition_attempt_id").references(() => workUnitTransitionAttempts.id, { onDelete: "set null" }),
    varKey: text("var_key").notNull(),
    varType: text("var_type").notNull(),
    valueJson: text("value_json", { mode: "json" }).$type<JsonMap>().notNull(),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("execution_outputs_execution_type_idx").on(table.workflowExecutionId, table.varType),
    index("execution_outputs_transition_type_idx").on(table.transitionAttemptId, table.varType),
    index("execution_outputs_work_unit_type_idx").on(table.workUnitId, table.varType),
  ],
);

export const gateEvaluations = sqliteTable(
  "gate_evaluations",
  {
    /**
     * Table `gate_evaluations`
     * Purpose: persisted gate decisions/findings for audit and UX diagnostics.
     * Fields:
     * - id: gate evaluation id.
     * - transitionAttemptId: transition attempt reference.
     * - gateScope: start_gate/completion_gate scope.
     * - decision: pass/warn/block decision.
     * - rulesHash: hash of evaluated ruleset.
     * - summaryJson: high-level decision summary.
     * - failedFindingsJson: detailed failed/warn findings.
     * - createdAt: evaluation timestamp.
     */
    id: idCol(),
    transitionAttemptId: text("transition_attempt_id")
      .notNull()
      .references(() => workUnitTransitionAttempts.id, { onDelete: "cascade" }),
    gateScope: text("gate_scope").notNull(),
    decision: text("decision").notNull(),
    rulesHash: text("rules_hash"),
    summaryJson: text("summary_json", { mode: "json" }).$type<JsonMap>().notNull(),
    failedFindingsJson: text("failed_findings_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
  },
  (table) => [index("gate_evaluations_attempt_scope_idx").on(table.transitionAttemptId, table.gateScope, table.decision)],
);


export const slotDefinitions = sqliteTable(
  "slot_definitions",
  {
    /**
     * Table `slot_definitions`
     * Purpose: slot ledger per work-unit type.
     * Fields:
     * - id: slot definition id.
     * - methodologyVersionId: owning methodology version.
     * - workUnitTypeId: owning work-unit type.
     * - slotKey: slot key.
     * - valueType: slot value type marker.
     * - headPolicy: single_head or multi_head policy.
     * - descriptionJson: slot description payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "cascade" }),
    workUnitTypeId: text("work_unit_type_id")
      .notNull()
      .references(() => workUnitTypeDefinitions.id, { onDelete: "cascade" }),
    slotKey: text("slot_key").notNull(),
    valueType: text("value_type").notNull(),
    headPolicy: text("head_policy").notNull(),
    descriptionJson: text("description_json", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("slot_definitions_unique_idx").on(table.methodologyVersionId, table.workUnitTypeId, table.slotKey)],
);

export const slotSnapshotVersions = sqliteTable(
  "slot_snapshot_versions",
  {
    /**
     * Table `slot_snapshot_versions`
     * Purpose: immutable slot snapshot history.
     * Fields:
     * - id: snapshot row id.
     * - projectId: owning project.
     * - workUnitId: owning work-unit.
     * - slotDefinitionId: slot definition reference.
     * - snapshotVersion: monotonic version number per slot.
     * - digest: normalized content hash for diff/staleness checks.
     * - artifactRefJson: artifact/reference payload.
     * - metaJson: additional snapshot metadata.
     * - createdByExecutionId: originating execution id.
     * - createdByStepExecutionId: originating step execution id.
     * - createdAt: creation timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workUnitId: text("work_unit_id")
      .notNull()
      .references(() => workUnits.id, { onDelete: "cascade" }),
    slotDefinitionId: text("slot_definition_id")
      .notNull()
      .references(() => slotDefinitions.id, { onDelete: "cascade" }),
    snapshotVersion: integer("snapshot_version").notNull(),
    digest: text("digest").notNull(),
    artifactRefJson: text("artifact_ref_json", { mode: "json" }).$type<JsonMap>().notNull(),
    metaJson: text("meta_json", { mode: "json" }).$type<JsonMap>(),
    createdByExecutionId: text("created_by_execution_id").references(() => workflowExecutions.id, { onDelete: "set null" }),
    createdByStepExecutionId: text("created_by_step_execution_id").references(() => stepExecutions.id, { onDelete: "set null" }),
    createdAt: createdAtCol(),
  },
  (table) => [
    uniqueIndex("slot_snapshot_versions_unique_idx").on(table.workUnitId, table.slotDefinitionId, table.snapshotVersion),
    index("slot_snapshot_versions_lookup_idx").on(table.workUnitId, table.slotDefinitionId, table.createdAt),
    index("slot_snapshot_versions_digest_idx").on(table.digest),
  ],
);

export const slotHeads = sqliteTable(
  "slot_heads",
  {
    /**
     * Table `slot_heads`
     * Purpose: current head pointer(s) for slots.
     * Fields:
     * - id: head row id.
     * - projectId: owning project.
     * - workUnitId: owning work-unit.
     * - slotDefinitionId: slot definition reference.
     * - headLabel: head label (for single/multi-head policies).
     * - slotSnapshotVersionId: pointed snapshot id.
     * - updatedAt: pointer update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workUnitId: text("work_unit_id")
      .notNull()
      .references(() => workUnits.id, { onDelete: "cascade" }),
    slotDefinitionId: text("slot_definition_id")
      .notNull()
      .references(() => slotDefinitions.id, { onDelete: "cascade" }),
    headLabel: text("head_label").notNull(),
    slotSnapshotVersionId: text("slot_snapshot_version_id")
      .notNull()
      .references(() => slotSnapshotVersions.id, { onDelete: "cascade" }),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("slot_heads_unique_idx").on(table.workUnitId, table.slotDefinitionId, table.headLabel)],
);


export const variables = sqliteTable(
  "variables",
  {
    /**
     * Table `variables`
     * Purpose: runtime current-value store for workflow variables.
     * Fields:
     * - id: variable row id.
     * - executionId: owning execution.
     * - scopeType: variable scope category.
     * - scopeId: scope identifier.
     * - name: variable key.
     * - value: current variable value payload.
     * - valueSchema: optional value schema snapshot.
     * - source: variable source classification.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    executionId: text("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    scopeType: text("scope_type").notNull().default("execution"),
    scopeId: text("scope_id"),
    name: text("name").notNull(),
    value: text("value", { mode: "json" }).$type<JsonMap>().notNull(),
    valueSchema: text("value_schema", { mode: "json" }).$type<JsonMap>(),
    source: text("source").notNull(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [
    uniqueIndex("variables_execution_name_uq").on(table.executionId, table.name),
    index("variables_scope_idx").on(table.scopeType, table.scopeId),
  ],
);

export const variableHistory = sqliteTable(
  "variable_history",
  {
    /**
     * Table `variable_history`
     * Purpose: append-only variable mutation history.
     * Fields:
     * - id: history row id.
     * - variableId: variable reference.
     * - executionId: execution context.
     * - name: variable key snapshot.
     * - previousValue: value before mutation.
     * - newValue: value after mutation.
     * - source: mutation source classification.
     * - stepNumber: optional producing step number.
     * - changedAt: mutation timestamp.
     */
    id: idCol(),
    variableId: text("variable_id")
      .notNull()
      .references(() => variables.id, { onDelete: "cascade" }),
    executionId: text("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    previousValue: text("previous_value", { mode: "json" }).$type<JsonMap>(),
    newValue: text("new_value", { mode: "json" }).$type<JsonMap>().notNull(),
    source: text("source").notNull(),
    stepNumber: integer("step_number"),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("variable_history_execution_idx").on(table.executionId, table.changedAt)],
);

export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    /**
     * Table `chat_sessions`
     * Purpose: conversational session lineage for agent steps.
     * Fields:
     * - id: chat session id.
     * - executionId: owning workflow execution.
     * - stepExecutionId: owning step execution.
     * - continuityKey: key for continuation across steps.
     * - parentSessionId: parent session lineage pointer.
     * - isActiveLineage: active lineage marker.
     * - status: chat session status.
     * - messageCount: number of messages in session.
     * - tokenCount: token usage counter.
     * - metadata: session metadata payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     * - completedAt: completion timestamp.
     */
    id: idCol(),
    executionId: text("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepExecutionId: text("step_execution_id")
      .notNull()
      .references(() => stepExecutions.id, { onDelete: "cascade" }),
    continuityKey: text("continuity_key"),
    parentSessionId: text("parent_session_id"),
    isActiveLineage: integer("is_active_lineage", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull(),
    messageCount: integer("message_count").notNull().default(0),
    tokenCount: integer("token_count").notNull().default(0),
    metadata: text("metadata", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("chat_sessions_execution_step_idx").on(table.executionId, table.stepExecutionId),
    index("chat_sessions_continuity_idx").on(table.executionId, table.continuityKey, table.isActiveLineage),
  ],
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    /**
     * Table `chat_messages`
     * Purpose: immutable ordered messages within a chat session.
     * Fields:
     * - id: message id.
     * - sessionId: parent chat session id.
     * - role: message role (user/assistant/system/tool).
     * - content: message content text.
     * - sequenceNumber: in-session ordering number.
     * - metadata: additional message metadata payload.
     * - createdAt: creation timestamp.
     */
    id: idCol(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("chat_messages_session_sequence_idx").on(table.sessionId, table.sequenceNumber),
    index("chat_messages_role_idx").on(table.role),
  ],
);

export const streamCheckpoints = sqliteTable(
  "stream_checkpoints",
  {
    /**
     * Table `stream_checkpoints`
     * Purpose: stream recovery checkpoints for chat streaming.
     * Fields:
     * - id: checkpoint id.
     * - sessionId: parent chat session id.
     * - status: stream checkpoint status.
     * - accumulatedText: accumulated output text.
     * - tokenCount: accumulated token count.
     * - errorMessage: optional stream error detail.
     * - startedAt: stream start timestamp.
     * - endedAt: stream end timestamp.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    accumulatedText: text("accumulated_text").notNull().default(""),
    tokenCount: integer("token_count").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("stream_checkpoints_session_idx").on(table.sessionId, table.status)],
);

export const approvalAudit = sqliteTable(
  "approval_audit",
  {
    /**
     * Table `approval_audit`
     * Purpose: durable audit log for approval decisions.
     * Fields:
     * - id: audit row id.
     * - executionId: related workflow execution.
     * - toolName: tool identifier.
     * - toolType: tool category.
     * - autoApproved: whether auto-approval applied.
     * - reason: approval decision reason.
     * - trustLevel: trust classification at decision time.
     * - riskLevel: risk classification at decision time.
     * - userResponse: optional user response payload.
     * - timeoutOccurred: whether approval timed out.
     * - createdAt: decision timestamp.
     */
    id: idCol(),
    executionId: text("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    toolType: text("tool_type").notNull(),
    autoApproved: integer("auto_approved", { mode: "boolean" }).notNull(),
    reason: text("reason").notNull(),
    trustLevel: text("trust_level").notNull(),
    riskLevel: text("risk_level").notNull(),
    userResponse: text("user_response", { mode: "json" }).$type<JsonMap>(),
    timeoutOccurred: integer("timeout_occurred", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAtCol(),
  },
  (table) => [
    index("approval_audit_execution_idx").on(table.executionId, table.createdAt),
    index("approval_audit_tool_idx").on(table.toolType, table.autoApproved),
  ],
);

export const userApprovalSettings = sqliteTable(
  "user_approval_settings",
  {
    /**
     * Table `user_approval_settings`
     * Purpose: user-specific approval preferences.
     * Fields:
     * - id: settings row id.
     * - userId: owning user id.
     * - enabled: global approval system enablement for user.
     * - trustLevel: default user trust level.
     * - toolOverrides: per-tool override settings payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    trustLevel: text("trust_level").notNull(),
    toolOverrides: text("tool_overrides", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("user_approval_settings_user_uq").on(table.userId)],
);


export const projectArtifacts = sqliteTable(
  "project_artifacts",
  {
    /**
     * Table `project_artifacts`
     * Purpose: produced artifact tracking for projects/workflows.
     * Fields:
     * - id: artifact row id.
     * - projectId: owning project.
     * - workflowId: producing workflow.
     * - type: artifact type.
     * - filePath: artifact filesystem path.
     * - gitCommitHash: optional git commit hash at creation.
     * - metadata: artifact metadata payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    filePath: text("file_path").notNull(),
    gitCommitHash: text("git_commit_hash"),
    metadata: text("metadata", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("project_artifacts_project_idx").on(table.projectId, table.type)],
);

export const workflowTemplates = sqliteTable(
  "workflow_templates",
  {
    /**
     * Table `workflow_templates`
     * Purpose: template registry for generated workflow artifacts.
     * Fields:
     * - id: template id.
     * - name: unique template key.
     * - displayName: UI-facing name.
     * - artifactType: produced artifact type.
     * - template: template body text.
     * - templateVariables: declared template variables payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    artifactType: text("artifact_type").notNull(),
    template: text("template").notNull(),
    templateVariables: text("template_variables", { mode: "json" }).$type<JsonMap>().notNull(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [uniqueIndex("workflow_templates_name_uq").on(table.name)],
);

export const agents = sqliteTable(
  "agents",
  {
    /**
     * Table `agents`
     * Purpose: configured agent profiles and runtime defaults.
     * Fields:
     * - id: agent id.
     * - name: unique agent key.
     * - displayName: UI-facing agent name.
     * - role: agent role label.
     * - provider: model provider key.
     * - model: model id.
     * - temperature: generation temperature.
     * - instructions: system instruction text.
     * - tools: allowed tools payload.
     * - mcpServers: MCP server config payload.
     * - active: active/inactive flag.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    temperature: integer("temperature").notNull().default(0),
    instructions: text("instructions").notNull(),
    tools: text("tools", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    mcpServers: text("mcp_servers", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("agents_active_idx").on(table.active)],
);

export const trainingExamples = sqliteTable(
  "training_examples",
  {
    /**
     * Table `training_examples`
     * Purpose: optimization training examples captured from runs.
     * Fields:
     * - id: training example id.
     * - projectId: project context.
     * - workflowId: workflow context.
     * - stepId: step context.
     * - methodologyVersionId: methodology version context.
     * - workUnitTypeId: work-unit type context.
     * - transitionDefinitionId: transition context.
     * - input: model/tool input payload.
     * - expectedOutput: expected output payload.
     * - originalPrediction: original prediction payload.
     * - createdAt: creation timestamp.
     * - usedAt: training consumption timestamp.
     */
    id: idCol(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    stepId: text("step_id"),
    methodologyVersionId: text("methodology_version_id").references(() => methodologyVersions.id, { onDelete: "set null" }),
    workUnitTypeId: text("work_unit_type_id").references(() => workUnitTypeDefinitions.id, { onDelete: "set null" }),
    transitionDefinitionId: text("transition_definition_id").references(() => workUnitTransitionDefinitions.id, { onDelete: "set null" }),
    input: text("input", { mode: "json" }).$type<JsonMap>().notNull(),
    expectedOutput: text("expected_output", { mode: "json" }).$type<JsonMap>().notNull(),
    originalPrediction: text("original_prediction", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("training_examples_project_idx").on(table.projectId, table.createdAt)],
);

export const optimizationRuns = sqliteTable(
  "optimization_runs",
  {
    /**
     * Table `optimization_runs`
     * Purpose: optimizer run metadata and metrics.
     * Fields:
     * - id: optimization run id.
     * - projectId: project context.
     * - workflowId: workflow context.
     * - stepId: step context.
     * - methodologyVersionId: methodology version context.
     * - workUnitTypeId: work-unit type context.
     * - transitionDefinitionId: transition context.
     * - optimizerType: optimizer engine/type.
     * - metrics: optimizer metrics payload.
     * - artifactPath: optimization artifact path.
     * - createdAt: creation timestamp.
     * - appliedAt: timestamp when applied.
     */
    id: idCol(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    stepId: text("step_id"),
    methodologyVersionId: text("methodology_version_id").references(() => methodologyVersions.id, { onDelete: "set null" }),
    workUnitTypeId: text("work_unit_type_id").references(() => workUnitTypeDefinitions.id, { onDelete: "set null" }),
    transitionDefinitionId: text("transition_definition_id").references(() => workUnitTransitionDefinitions.id, { onDelete: "set null" }),
    optimizerType: text("optimizer_type").notNull(),
    metrics: text("metrics", { mode: "json" }).$type<JsonMap>().notNull(),
    artifactPath: text("artifact_path"),
    createdAt: createdAtCol(),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("optimization_runs_project_idx").on(table.projectId, table.createdAt)],
);

export const acePlaybooks = sqliteTable(
  "ace_playbooks",
  {
    /**
     * Table `ace_playbooks`
     * Purpose: learned playbook memory for agents.
     * Fields:
     * - id: playbook id.
     * - agentId: agent identifier.
     * - scope: playbook scope (global/user/project).
     * - userId: optional user scope binding.
     * - projectId: optional project scope binding.
     * - playbook: playbook payload.
     * - version: playbook version number.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    agentId: text("agent_id").notNull(),
    scope: text("scope").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    playbook: text("playbook", { mode: "json" }).$type<JsonMap>().notNull(),
    version: integer("version").notNull().default(1),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("ace_playbooks_scope_idx").on(table.agentId, table.scope)],
);

export const miproTrainingExamples = sqliteTable(
  "mipro_training_examples",
  {
    /**
     * Table `mipro_training_examples`
     * Purpose: MiPRO training examples and scoring history.
     * Fields:
     * - id: MiPRO example id.
     * - agentId: agent identifier.
     * - projectId: project context.
     * - workflowId: workflow context.
     * - stepId: step context.
     * - input: training input payload.
     * - expectedOutput: expected output payload.
     * - rejectionHistory: rejection history payload.
     * - scorerResults: scoring result payload.
     * - createdAt: creation timestamp.
     * - updatedAt: last update timestamp.
     */
    id: idCol(),
    agentId: text("agent_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
    stepId: text("step_id"),
    input: text("input", { mode: "json" }).$type<JsonMap>().notNull(),
    expectedOutput: text("expected_output", { mode: "json" }).$type<JsonMap>().notNull(),
    rejectionHistory: text("rejection_history", { mode: "json" }).$type<JsonMap>().notNull().$defaultFn(() => ({})),
    scorerResults: text("scorer_results", { mode: "json" }).$type<JsonMap>(),
    createdAt: createdAtCol(),
    updatedAt: updatedAtCol(),
  },
  (table) => [index("mipro_training_examples_agent_idx").on(table.agentId, table.createdAt)],
);


/**
 * Relation `workflowExecutionsRelations`
 * Purpose: query graph from execution to steps/project/work-unit.
 * Links:
 * - steps: one execution -> many step executions.
 * - project: optional execution -> project.
 * - workUnit: optional execution -> work unit.
 */
export const workflowExecutionsRelations = relations(workflowExecutions, ({ many, one }) => ({
  steps: many(stepExecutions),
  project: one(projects, { fields: [workflowExecutions.projectId], references: [projects.id] }),
  workUnit: one(workUnits, { fields: [workflowExecutions.workUnitId], references: [workUnits.id] }),
}));

/**
 * Relation `stepExecutionsRelations`
 * Purpose: query graph from step execution to execution/session lineage.
 * Links:
 * - execution: parent workflow execution.
 * - chatSessions: step-level chat sessions produced during this step.
 */
export const stepExecutionsRelations = relations(stepExecutions, ({ one, many }) => ({
  execution: one(workflowExecutions, { fields: [stepExecutions.executionId], references: [workflowExecutions.id] }),
  chatSessions: many(chatSessions),
}));

/**
 * Relation `chatSessionsRelations`
 * Purpose: query graph for chat session context.
 * Links:
 * - execution: owning workflow execution.
 * - stepExecution: owning step execution.
 * - messages: ordered chat messages in this session.
 */
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  execution: one(workflowExecutions, { fields: [chatSessions.executionId], references: [workflowExecutions.id] }),
  stepExecution: one(stepExecutions, { fields: [chatSessions.stepExecutionId], references: [stepExecutions.id] }),
  messages: many(chatMessages),
}));

/**
 * Relation `workUnitTransitionAttemptsRelations`
 * Purpose: query graph for transition attempt diagnostics.
 * Links:
 * - workUnit: target work-unit instance.
 * - execution: workflow execution used by this attempt.
 * - evaluations: persisted gate evaluations for this attempt.
 */
export const workUnitTransitionAttemptsRelations = relations(workUnitTransitionAttempts, ({ one, many }) => ({
  workUnit: one(workUnits, { fields: [workUnitTransitionAttempts.workUnitId], references: [workUnits.id] }),
  execution: one(workflowExecutions, {
    fields: [workUnitTransitionAttempts.workflowExecutionId],
    references: [workflowExecutions.id],
  }),
  evaluations: many(gateEvaluations),
}));
