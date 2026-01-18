import * as fs from "node:fs";
import * as path from "node:path";
import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";

export class UserFormError extends Data.TaggedError("UserFormError")<{
  readonly cause: unknown;
  readonly operation: "validate" | "render" | "submit";
  readonly fieldName?: string;
  readonly message: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly fieldName?: string;
  readonly validationType: "path" | "string" | "boolean" | "number" | "choice";
}> {}

/**
 * Configuration for path-based inputs (directory picker, file picker)
 * Shared between backend validation and frontend components
 */
export interface PathConfig {
  readonly mustExist?: boolean;
  readonly selectMode?: "file" | "directory";
  readonly startPath?: string;
}

export interface UserFormConfig {
  readonly prompt: string;
  readonly responseVariable: string;
  readonly responseType: "path" | "string" | "boolean" | "number" | "choice" | "relative-path";
  readonly validation?: {
    readonly required?: boolean;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly min?: number;
    readonly max?: number;
    readonly pattern?: string;
  };
  readonly pathConfig?: PathConfig;
  readonly choices?: readonly string[];
}

export interface UserFormHandlerOutput extends StepHandlerOutput {
  readonly requiresUserInput: boolean;
}

export interface UserFormHandler {
  readonly _tag: "UserFormHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<UserFormHandlerOutput, UserFormError | ValidationError>;
}

export const UserFormHandler = Context.GenericTag<UserFormHandler>("UserFormHandler");

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_PATH_CHARS = /[<>:"|?*]/;
const FOLDER_NAME_REGEX = /^\.?[a-zA-Z0-9][a-zA-Z0-9_\-.]*$/;
const MAX_FOLDER_NAME_LENGTH = 255;

export interface FolderNameValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFolderName(name: string): FolderNameValidationResult {
  if (!name) {
    return { valid: false, error: "Folder name is required" };
  }

  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    return {
      valid: false,
      error: "Folder name is too long (max 255 characters)",
    };
  }

  if (INVALID_PATH_CHARS.test(name)) {
    return { valid: false, error: 'Folder name cannot contain < > : " | ? *' };
  }

  if (WINDOWS_RESERVED_NAMES.test(name)) {
    return {
      valid: false,
      error: `'${name.toUpperCase()}' is a reserved system name`,
    };
  }

  if (!FOLDER_NAME_REGEX.test(name)) {
    return {
      valid: false,
      error: "Folder name must start with a letter, number, or dot",
    };
  }

  return { valid: true };
}

function validateRelativePath(
  input: string,
  config: UserFormConfig,
): Effect.Effect<string, ValidationError> {
  return Effect.gen(function* () {
    if (config.validation?.required && !input) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path is required",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (!input) {
      return input;
    }

    if (input.includes("..")) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path cannot contain '..' (directory traversal)",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (input.startsWith("/")) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path must be relative, not absolute",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (input.includes("//")) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path cannot contain double slashes",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (INVALID_PATH_CHARS.test(input)) {
      return yield* Effect.fail(
        new ValidationError({
          message: 'Path cannot contain < > : " | ? *',
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    const segments = input.split("/");
    for (const segment of segments) {
      if (WINDOWS_RESERVED_NAMES.test(segment)) {
        return yield* Effect.fail(
          new ValidationError({
            message: `Path contains reserved name '${segment.toUpperCase()}'`,
            validationType: "path",
            fieldName: config.responseVariable,
          }),
        );
      }
    }

    return input;
  });
}

function validatePath(
  inputPath: string,
  config: UserFormConfig,
): Effect.Effect<string, ValidationError> {
  return Effect.gen(function* () {
    if (config.validation?.required && !inputPath) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path is required",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (!inputPath) {
      return inputPath;
    }

    if (!path.isAbsolute(inputPath)) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Path must be absolute",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (inputPath.includes("..")) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Directory traversal not allowed",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    const parentDir = path.dirname(inputPath);
    const parentExists = yield* Effect.tryPromise({
      try: async () => {
        const stat = await fs.promises.stat(parentDir);
        return stat.isDirectory();
      },
      catch: (error: unknown) => {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          return new ValidationError({
            message: `Parent directory does not exist: ${parentDir}`,
            validationType: "path",
            fieldName: config.responseVariable,
          });
        }
        return new ValidationError({
          message: `Error checking parent directory: ${err.message}`,
          validationType: "path",
          fieldName: config.responseVariable,
        });
      },
    });

    if (parentExists instanceof ValidationError) {
      return yield* Effect.fail(parentExists);
    }

    if (!parentExists) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Parent directory does not exist: ${parentDir}`,
          validationType: "path",
          fieldName: config.responseVariable,
        }),
      );
    }

    const hasWritePermission = yield* Effect.tryPromise({
      try: async () => {
        await fs.promises.access(parentDir, fs.constants.W_OK);
        return true;
      },
      catch: () =>
        new ValidationError({
          message: "No write permission to parent directory",
          validationType: "path",
          fieldName: config.responseVariable,
        }),
    });

    if (hasWritePermission instanceof ValidationError) {
      return yield* Effect.fail(hasWritePermission);
    }

    if (config.pathConfig?.mustExist) {
      const pathExists = yield* Effect.tryPromise({
        try: async () => {
          await fs.promises.stat(inputPath);
          return true;
        },
        catch: (error: unknown) => {
          const err = error as NodeJS.ErrnoException;
          if (err.code === "ENOENT") {
            return new ValidationError({
              message: `Path does not exist: ${inputPath}`,
              validationType: "path",
              fieldName: config.responseVariable,
            });
          }
          return new ValidationError({
            message: `Error checking path: ${err.message}`,
            validationType: "path",
            fieldName: config.responseVariable,
          });
        },
      });

      if (pathExists instanceof ValidationError) {
        return yield* Effect.fail(pathExists);
      }
    }

    return inputPath;
  });
}

function validateString(
  input: string,
  config: UserFormConfig,
): Effect.Effect<string, ValidationError> {
  return Effect.gen(function* () {
    if (config.validation?.required && !input) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Input is required",
          validationType: "string",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (!input) {
      return input;
    }

    if (config.validation?.minLength !== undefined && input.length < config.validation.minLength) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Input must be at least ${config.validation.minLength} characters`,
          validationType: "string",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (config.validation?.maxLength !== undefined && input.length > config.validation.maxLength) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Input must be at most ${config.validation.maxLength} characters`,
          validationType: "string",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (config.validation?.pattern) {
      const regex = new RegExp(config.validation.pattern);
      if (!regex.test(input)) {
        return yield* Effect.fail(
          new ValidationError({
            message: "Input does not match required pattern",
            validationType: "string",
            fieldName: config.responseVariable,
          }),
        );
      }
    }

    return input;
  });
}

function validateBoolean(
  input: unknown,
  config: UserFormConfig,
): Effect.Effect<boolean, ValidationError> {
  return Effect.gen(function* () {
    if (typeof input === "boolean") {
      return input;
    }

    if (typeof input === "string") {
      const lower = input.toLowerCase();
      if (lower === "true" || lower === "yes" || lower === "1") {
        return true;
      }
      if (lower === "false" || lower === "no" || lower === "0") {
        return false;
      }
    }

    return yield* Effect.fail(
      new ValidationError({
        message: "Input must be a boolean value",
        validationType: "boolean",
        fieldName: config.responseVariable,
      }),
    );
  });
}

function validateNumber(
  input: unknown,
  config: UserFormConfig,
): Effect.Effect<number, ValidationError> {
  return Effect.gen(function* () {
    let num: number;

    if (typeof input === "number") {
      num = input;
    } else if (typeof input === "string") {
      num = Number.parseFloat(input);
      if (Number.isNaN(num)) {
        return yield* Effect.fail(
          new ValidationError({
            message: "Input must be a valid number",
            validationType: "number",
            fieldName: config.responseVariable,
          }),
        );
      }
    } else {
      return yield* Effect.fail(
        new ValidationError({
          message: "Input must be a number",
          validationType: "number",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (config.validation?.min !== undefined && num < config.validation.min) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Number must be at least ${config.validation.min}`,
          validationType: "number",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (config.validation?.max !== undefined && num > config.validation.max) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Number must be at most ${config.validation.max}`,
          validationType: "number",
          fieldName: config.responseVariable,
        }),
      );
    }

    return num;
  });
}

function validateChoice(
  input: string,
  config: UserFormConfig,
): Effect.Effect<string, ValidationError> {
  return Effect.gen(function* () {
    if (config.validation?.required && !input) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Selection is required",
          validationType: "choice",
          fieldName: config.responseVariable,
        }),
      );
    }

    if (config.choices && config.choices.length > 0 && input) {
      if (!config.choices.includes(input)) {
        return yield* Effect.fail(
          new ValidationError({
            message: `Invalid choice. Must be one of: ${config.choices.join(", ")}`,
            validationType: "choice",
            fieldName: config.responseVariable,
          }),
        );
      }
    }

    return input;
  });
}

function validateInput(
  userInput: unknown,
  config: UserFormConfig,
): Effect.Effect<unknown, ValidationError> {
  switch (config.responseType) {
    case "path":
      return validatePath(userInput as string, config);
    case "relative-path":
      return validateRelativePath(userInput as string, config);
    case "string":
      return validateString(userInput as string, config);
    case "boolean":
      return validateBoolean(userInput, config);
    case "number":
      return validateNumber(userInput, config);
    case "choice":
      return validateChoice(userInput as string, config);
    default:
      return Effect.fail(
        new ValidationError({
          message: `Unsupported response type: ${(config as UserFormConfig).responseType}`,
          validationType: "string",
          fieldName: config.responseVariable,
        }),
      );
  }
}

export const UserFormHandlerLive = Layer.succeed(UserFormHandler, {
  _tag: "UserFormHandler" as const,

  execute: (input: StepHandlerInput, userInput?: unknown) =>
    Effect.gen(function* () {
      const config = input.stepConfig as unknown as UserFormConfig;

      if (userInput === undefined || userInput === null) {
        return {
          result: {},
          requiresUserInput: true,
        };
      }

      const validatedInput = yield* validateInput(userInput, config).pipe(
        Effect.mapError(
          (error) =>
            new UserFormError({
              cause: error,
              operation: "validate",
              fieldName: config.responseVariable,
              message: error.message,
            }),
        ),
      );

      return {
        result: { [config.responseVariable]: validatedInput },
        variableUpdates: { [config.responseVariable]: validatedInput },
        requiresUserInput: false,
      };
    }),
});
