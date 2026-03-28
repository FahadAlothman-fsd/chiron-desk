import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { methodologyVersions } from "./methodology";

const timestampDefault = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  projectRootPath: text("project_root_path"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault)
    .$onUpdate(() => new Date()),
});

export const projectMethodologyPins = sqliteTable(
  "project_methodology_pins",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "restrict" }),
    methodologyId: text("methodology_id").notNull(),
    methodologyKey: text("methodology_key").notNull(),
    publishedVersion: text("published_version").notNull(),
    actorId: text("actor_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefault)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("project_methodology_pins_version_idx").on(table.methodologyVersionId),
    index("project_methodology_pins_methodology_idx").on(table.methodologyId, table.methodologyKey),
  ],
);

export const projectMethodologyPinEvents = sqliteTable(
  "project_methodology_pin_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: ["pinned", "repinned"] }).notNull(),
    actorId: text("actor_id"),
    previousVersion: text("previous_version"),
    newVersion: text("new_version").notNull(),
    evidenceRef: text("evidence_ref").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("project_methodology_pin_events_lineage_idx").on(
      table.projectId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const projectExecutions = sqliteTable(
  "project_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    methodologyVersionId: text("methodology_version_id")
      .notNull()
      .references(() => methodologyVersions.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefault),
  },
  (table) => [
    index("project_executions_project_idx").on(table.projectId, table.createdAt, table.id),
  ],
);
