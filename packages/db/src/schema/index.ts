// Export all schemas from a single index
// This allows: import * as schema from './schema'

// Agent definitions
export * from "./agents";
// Generated artifacts tracking
export * from "./artifacts";
// Auth tables (from better-t3-stack setup with better-auth)
export * from "./auth";
// Core tables (projects, paths, config)
export * from "./core";
// Dialog sessions (optional - for clarification dialogs)
export * from "./dialog-sessions";
// ax optimization tables
export * from "./optimization";
// Project management (epics/stories)
export * from "./project-management";
// Step config Zod schemas and types
export * from "./step-configs";
// Workflow templates (Handlebars templates for artifacts)
export * from "./workflow-templates";
// Workflow definitions and execution
export * from "./workflows";
