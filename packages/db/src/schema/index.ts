// Export all schemas from a single index
// This allows: import * as schema from './schema'

// Core tables (projects, paths, config)
export * from "./core";

// Agent definitions
export * from "./agents";

// Workflow definitions and execution
export * from "./workflows";

// Step config Zod schemas and types
export * from "./step-configs";

// Workflow templates (Handlebars templates for artifacts)
export * from "./workflow-templates";

// Dialog sessions (optional - for clarification dialogs)
export * from "./dialog-sessions";

// Generated artifacts tracking
export * from "./artifacts";

// ax optimization tables
export * from "./optimization";

// Project management (epics/stories)
export * from "./project-management";

// Auth tables (from better-t3-stack setup with better-auth)
export * from "./auth";
