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
    definitionJson: text("definition_json", { mode: "json" }),
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

export const methodologyVariableDefinitions = sqliteTable(
  "methodology_variable_definitions",
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
    uniqueIndex("methodology_var_defs_vid_key_idx").on(table.methodologyVersionId, table.key),
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
