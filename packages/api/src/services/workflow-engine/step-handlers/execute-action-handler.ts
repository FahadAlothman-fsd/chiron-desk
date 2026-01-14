import * as fs from "node:fs";
import type { ExecuteActionStepConfig, WorkflowStep } from "@chiron/db";
import { db, eq, projects } from "@chiron/db";
import simpleGit from "simple-git";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";
import { resolveVariables } from "../variable-resolver";

/**
 * ExecuteActionStepHandler - Executes backend actions without user input
 * Supports set-variable, file, git, and database actions
 *
 * Story 1.8: Added git init and database update operations
 */
export class ExecuteActionStepHandler implements StepHandler {
  async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    userInput?: unknown,
  ): Promise<StepResult> {
    const config = step.config as ExecuteActionStepConfig;

    // Check if this step requires user confirmation
    if (config.requiresUserConfirmation) {
      // If userInput is undefined, this is the first execution - pause for confirmation
      if (userInput === undefined) {
        console.log("[ExecuteActionHandler] First execution - requiring user confirmation");
        console.log(
          "[ExecuteActionHandler] Available variables:",
          Object.keys(context.executionVariables),
        );
        console.log(
          "[ExecuteActionHandler] project_path =",
          context.executionVariables.project_path,
        );

        // ONLY resolve variables for preview - DO NOT execute actions yet
        const resolvedActions = await this.resolveActions(config.actions, context);

        // Return preview data showing what WILL be executed
        return {
          output: {
            preview: true,
            actions: resolvedActions.map((action, index) => ({
              index,
              type: action.type,
              config: (action as any).config,
              description: this.getActionDescription(action),
            })),
          },
          nextStepNumber: step.nextStepNumber ?? null,
          requiresUserInput: true, // Wait for user to click Continue
        };
      }

      console.log("[ExecuteActionHandler] User confirmed - executing actions");
    }

    // Execute actions (either no confirmation needed, or user already confirmed)
    const resolvedActions = await this.resolveActions(config.actions, context);

    // Execute actions based on execution mode
    const output =
      config.executionMode === "parallel"
        ? await this.executeParallel(resolvedActions, context)
        : await this.executeSequential(resolvedActions, context);

    return {
      output,
      nextStepNumber: step.nextStepNumber ?? null,
      requiresUserInput: false, // Complete the step
    };
  }

  /**
   * Generate human-readable description for an action
   */
  private getActionDescription(action: any): string {
    switch (action.type) {
      case "file": {
        const op = action.config?.operation;
        const path = action.config?.path;
        if (op === "mkdir") {
          return `Create directory: ${path}`;
        }
        if (op === "write") {
          return `Create file: ${path}`;
        }
        return `File operation (${op}): ${path}`;
      }
      case "git": {
        const op = action.config?.operation;
        const path = action.config?.path;
        if (op === "init") {
          return `Initialize git repository in: ${path}`;
        }
        if (op === "commit") {
          const message = action.config?.message;
          return `Git commit: "${message}"`;
        }
        return `Git operation (${op}) in: ${path}`;
      }
      case "database": {
        const table = action.config?.table;
        const op = action.config?.operation;
        return `Update database table: ${table} (${op})`;
      }
      case "set-variable": {
        const name = action.config?.name;
        return `Set variable: ${name}`;
      }
      default:
        return `${action.type} action`;
    }
  }

  /**
   * Resolve variables in action configurations
   */
  private async resolveActions(
    actions: ExecuteActionStepConfig["actions"],
    context: ExecutionContext,
  ): Promise<ExecuteActionStepConfig["actions"]> {
    const resolved = [];

    for (const action of actions) {
      if (action.type === "set-variable") {
        let resolvedValue = (action as any).config.value;

        // Only resolve if it's a string (might contain {{variables}})
        if (typeof (action as any).config.value === "string") {
          resolvedValue = resolveVariables((action as any).config.value, context);
        }

        resolved.push({
          ...action,
          config: {
            ...(action as any).config,
            value: resolvedValue,
          },
        });
      } else if (action.type === "file") {
        // Resolve variables in file action (path, content)
        const fileAction = action as any;
        const resolvedPath = resolveVariables(fileAction.config?.path, context);
        const resolvedContent = fileAction.config?.content
          ? resolveVariables(fileAction.config.content, context)
          : undefined;
        resolved.push({
          ...action,
          config: {
            ...fileAction.config,
            path: resolvedPath,
            content: resolvedContent,
          },
        });
      } else if (action.type === "git") {
        // Resolve directory path and message for git operations
        const gitAction = action as any;
        const resolvedPath = resolveVariables(gitAction.config?.path, context);
        const resolvedMessage = gitAction.config?.message
          ? resolveVariables(gitAction.config.message, context)
          : undefined;
        resolved.push({
          ...action,
          config: {
            ...gitAction.config,
            path: resolvedPath,
            message: resolvedMessage,
          },
        });
      } else if (action.type === "database") {
        // Resolve variables in database action columns and where clause
        const dbAction = action as any;
        const resolvedColumns: Record<string, unknown> = {};
        const resolvedWhere: Record<string, unknown> = {};

        // Resolve column values
        if (dbAction.config?.columns) {
          for (const [key, value] of Object.entries(dbAction.config.columns)) {
            if (typeof value === "string") {
              resolvedColumns[key] = resolveVariables(value, context);
            } else {
              resolvedColumns[key] = value;
            }
          }
        }

        // Resolve where clause values
        if (dbAction.config?.where) {
          for (const [key, value] of Object.entries(dbAction.config.where)) {
            if (typeof value === "string") {
              resolvedWhere[key] = resolveVariables(value, context);
            } else {
              resolvedWhere[key] = value;
            }
          }
        }

        resolved.push({
          ...action,
          config: {
            ...dbAction.config,
            columns: resolvedColumns,
            where: resolvedWhere,
          },
        });
      } else {
        // For future action types (file)
        resolved.push(action);
      }
    }

    return resolved;
  }

  /**
   * Execute actions sequentially (each action sees previous action's output)
   */
  private async executeSequential(
    actions: ExecuteActionStepConfig["actions"],
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const output: Record<string, unknown> = {};

    for (const action of actions) {
      try {
        const actionOutput = await this.executeAction(action, context, output);
        Object.assign(output, actionOutput);
      } catch (error) {
        throw new Error(
          `Action ${action.type} failed at step index ${actions.indexOf(action)}: ${error}`,
          { cause: error },
        );
      }
    }

    return output;
  }

  /**
   * Execute actions in parallel (independent execution)
   */
  private async executeParallel(
    actions: ExecuteActionStepConfig["actions"],
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const promises = actions.map(async (action) => {
      try {
        return await this.executeAction(action, context, {});
      } catch (error) {
        throw new Error(`Parallel action ${action.type} failed: ${error}`, { cause: error });
      }
    });

    const results = await Promise.all(promises);
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ExecuteActionStepConfig["actions"][0],
    context: ExecutionContext,
    _currentOutput: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (action.type) {
      case "set-variable":
        return this.executeSetVariable(action as any, context);

      case "file":
        return this.executeFileAction(action as any, context);

      case "git":
        return this.executeGitAction(action as any, context);

      case "database":
        return this.executeDatabaseAction(action as any, context);

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute set-variable action
   */
  private async executeSetVariable(
    action: { type: "set-variable"; config: { variable: string; value: any } },
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const { variable, value } = action.config;

    // Handle nested variable paths (e.g., "metadata.complexity")
    if (variable.includes(".")) {
      return this.setNestedVariable(variable, value, context);
    }

    // Simple variable assignment
    return { [variable]: value };
  }

  /**
   * Set nested variable path (e.g., "metadata.complexity")
   */
  private setNestedVariable(
    variablePath: string,
    value: unknown,
    context: ExecutionContext,
  ): Record<string, unknown> {
    const keys = variablePath.split(".");
    const rootKey = keys[0];
    const nestedPath = keys.slice(1);

    // Get existing root object or create new
    const existing = (context.executionVariables[rootKey] as Record<string, unknown>) || {};

    // Navigate to nested location and set value
    let current = existing;
    for (let i = 0; i < nestedPath.length - 1; i++) {
      const key = nestedPath[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    // Set final value
    current[nestedPath[nestedPath.length - 1]] = value;

    return { [rootKey]: existing };
  }

  /**
   * Execute file action (write, read, delete)
   */
  private async executeFileAction(
    action: {
      type: "file";
      config: { operation: string; path: string; content?: string };
    },
    _context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const { operation, path: filePath, content } = action.config;

    switch (operation) {
      case "mkdir": {
        // Create directory (recursive to handle parent directories)
        await fs.promises.mkdir(filePath, { recursive: true });
        console.log(`[ExecuteActionHandler] Created directory: ${filePath}`);

        return {
          directory_created: true,
          directory_path: filePath,
        };
      }

      case "write": {
        if (!content) {
          throw new Error("File write operation requires content");
        }

        // Ensure parent directory exists
        const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
        if (!fs.existsSync(dirPath)) {
          await fs.promises.mkdir(dirPath, { recursive: true });
        }

        // Write file
        await fs.promises.writeFile(filePath, content, "utf-8");
        console.log(`[ExecuteActionHandler] Created file: ${filePath}`);

        return {
          file_created: true,
          file_path: filePath,
        };
      }

      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Story 1.8: Execute git action (git init, commit)
   */
  private async executeGitAction(
    action: {
      type: "git";
      config: {
        operation: string;
        path: string;
        message?: string;
        files?: string[];
      };
    },
    _context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const { operation, path: projectPath, message, files } = action.config;

    // Pre-flight check: Verify git is installed
    const gitInstalled = await this.isGitInstalled();
    if (!gitInstalled) {
      throw new Error("Git is not installed or not accessible. Please install git and try again.");
    }

    console.log(`[ExecuteActionHandler] Git ${operation} operation at path: ${projectPath}`);

    switch (operation) {
      case "init": {
        // Create directory if it doesn't exist
        if (!fs.existsSync(projectPath)) {
          console.log(`[ExecuteActionHandler] Directory doesn't exist, creating: ${projectPath}`);
          await fs.promises.mkdir(projectPath, { recursive: true });
          console.log(`[ExecuteActionHandler] Created directory: ${projectPath}`);
        } else {
          console.log(`[ExecuteActionHandler] Directory already exists: ${projectPath}`);
        }

        // Initialize git repository (idempotent - safe to run on existing repos)
        const git = simpleGit(projectPath);
        await git.init();
        console.log(`[ExecuteActionHandler] Git initialized at: ${projectPath}`);

        return {
          git_initialized: true,
          git_path: projectPath,
        };
      }

      case "commit": {
        if (!message) {
          throw new Error("Git commit operation requires a message");
        }

        const git = simpleGit(projectPath);

        // Add files to staging
        if (files && files.length > 0) {
          await git.add(files);
          console.log(`[ExecuteActionHandler] Staged files: ${files.join(", ")}`);
        }

        // Commit
        await git.commit(message);
        console.log(`[ExecuteActionHandler] Committed: ${message}`);

        return {
          git_committed: true,
          commit_message: message,
        };
      }

      default:
        throw new Error(`Unknown git operation: ${operation}`);
    }
  }

  /**
   * Check if git is installed and accessible
   */
  private async isGitInstalled(): Promise<boolean> {
    try {
      const git = simpleGit();
      const version = await git.version();
      console.log(`[ExecuteActionHandler] Git version: ${version.installed}`);
      return version.installed !== undefined;
    } catch (error) {
      console.error("[ExecuteActionHandler] Git check failed:", error);
      return false;
    }
  }

  /**
   * Story 1.8: Execute database action (update project record)
   */
  private async executeDatabaseAction(
    action: {
      type: "database";
      config: {
        table: string;
        operation: string;
        columns: Record<string, unknown>;
        where: Record<string, unknown>;
      };
    },
    _context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const { table, operation, columns, where } = action.config;

    console.log(`[ExecuteActionHandler] Database action: ${operation} on ${table}`);
    console.log("[ExecuteActionHandler] Columns:", columns);
    console.log("[ExecuteActionHandler] Where:", where);

    switch (operation) {
      case "update": {
        // Currently only supporting projects table
        if (table !== "projects") {
          throw new Error(`Database table "${table}" not supported yet`);
        }

        // Validate where clause has id
        if (!where.id) {
          throw new Error("Database update requires 'id' in where clause");
        }

        // Build the update object
        const updateData: Record<string, unknown> = {};

        // Map column names to database fields
        for (const [key, value] of Object.entries(columns)) {
          updateData[key] = value;
        }

        // Add updatedAt timestamp
        updateData.updatedAt = new Date();

        // Execute update
        const [updatedProject] = await db
          .update(projects)
          .set(updateData as any)
          .where(eq(projects.id, where.id as string))
          .returning();

        if (!updatedProject) {
          throw new Error(`Project with id ${where.id} not found`);
        }

        console.log(`[ExecuteActionHandler] Updated project: ${updatedProject.id}`);

        return {
          database_updated: true,
          updated_record_id: updatedProject.id,
        };
      }

      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
  }
}
