import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ============================================
// WORKFLOW TEMPLATES TABLE
// Stores Handlebars templates for artifact generation
// ============================================

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "prd-template"
  displayName: text("display_name").notNull(), // "Product Requirements Document"

  artifactType: text("artifact_type").notNull(), // "prd" | "architecture" | "story" | etc

  // Handlebars template content (markdown)
  template: text("template").notNull(),

  // Expected variables for this template
  templateVariables: jsonb("template_variables").$type<
    Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>
  >(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
