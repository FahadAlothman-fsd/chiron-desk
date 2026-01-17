import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Effect } from "effect";
import type { StepHandlerInput } from "../effect/step-registry";
import {
  createLegacyUserFormHandler,
  UserFormHandler,
  UserFormHandlerLive,
  validateFolderName,
} from "./user-form-handler";

function createInput(config: Record<string, unknown>): StepHandlerInput {
  return {
    stepConfig: config,
    variables: {},
    executionId: "test-execution-id",
  };
}

function runHandler(input: StepHandlerInput, userInput?: unknown) {
  const program = Effect.provide(
    Effect.flatMap(UserFormHandler, (handler) => handler.execute(input, userInput)),
    UserFormHandlerLive,
  );
  return Effect.runPromise(program);
}

describe("UserFormHandler", () => {
  describe("no user input", () => {
    it("returns requiresUserInput true when no input provided", async () => {
      const input = createInput({
        prompt: "Enter value",
        responseVariable: "test_var",
        responseType: "string",
      });

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(true);
      expect(result.result).toEqual({});
    });

    it("returns requiresUserInput true when input is null", async () => {
      const input = createInput({
        prompt: "Enter value",
        responseVariable: "test_var",
        responseType: "string",
      });

      const result = await runHandler(input, null);

      expect(result.requiresUserInput).toBe(true);
    });
  });

  describe("string validation", () => {
    it("accepts valid string input", async () => {
      const input = createInput({
        prompt: "Enter name",
        responseVariable: "name",
        responseType: "string",
      });

      const result = await runHandler(input, "John");

      expect(result.requiresUserInput).toBe(false);
      expect(result.variableUpdates).toEqual({ name: "John" });
    });

    it("rejects empty string when required", async () => {
      const input = createInput({
        prompt: "Enter name",
        responseVariable: "name",
        responseType: "string",
        validation: { required: true },
      });

      await expect(runHandler(input, "")).rejects.toThrow();
    });

    it("accepts empty string when not required", async () => {
      const input = createInput({
        prompt: "Enter name",
        responseVariable: "name",
        responseType: "string",
        validation: { required: false },
      });

      const result = await runHandler(input, "");

      expect(result.requiresUserInput).toBe(false);
      expect(result.variableUpdates).toEqual({ name: "" });
    });

    it("rejects string shorter than minLength", async () => {
      const input = createInput({
        prompt: "Enter name",
        responseVariable: "name",
        responseType: "string",
        validation: { minLength: 5 },
      });

      await expect(runHandler(input, "ab")).rejects.toThrow();
    });

    it("rejects string longer than maxLength", async () => {
      const input = createInput({
        prompt: "Enter name",
        responseVariable: "name",
        responseType: "string",
        validation: { maxLength: 5 },
      });

      await expect(runHandler(input, "abcdefgh")).rejects.toThrow();
    });

    it("rejects string not matching pattern", async () => {
      const input = createInput({
        prompt: "Enter email",
        responseVariable: "email",
        responseType: "string",
        validation: { pattern: "^[a-z]+@[a-z]+\\.[a-z]+$" },
      });

      await expect(runHandler(input, "invalid")).rejects.toThrow();
    });

    it("accepts string matching pattern", async () => {
      const input = createInput({
        prompt: "Enter email",
        responseVariable: "email",
        responseType: "string",
        validation: { pattern: "^[a-z]+@[a-z]+\\.[a-z]+$" },
      });

      const result = await runHandler(input, "test@example.com");

      expect(result.variableUpdates).toEqual({ email: "test@example.com" });
    });
  });

  describe("boolean validation", () => {
    it("accepts boolean true", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, true);

      expect(result.variableUpdates).toEqual({ confirmed: true });
    });

    it("accepts boolean false", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, false);

      expect(result.variableUpdates).toEqual({ confirmed: false });
    });

    it("parses string 'true' as boolean true", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, "true");

      expect(result.variableUpdates).toEqual({ confirmed: true });
    });

    it("parses string 'yes' as boolean true", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, "yes");

      expect(result.variableUpdates).toEqual({ confirmed: true });
    });

    it("parses string 'false' as boolean false", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, "false");

      expect(result.variableUpdates).toEqual({ confirmed: false });
    });

    it("parses string 'no' as boolean false", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      const result = await runHandler(input, "no");

      expect(result.variableUpdates).toEqual({ confirmed: false });
    });

    it("rejects invalid boolean string", async () => {
      const input = createInput({
        prompt: "Confirm?",
        responseVariable: "confirmed",
        responseType: "boolean",
      });

      await expect(runHandler(input, "maybe")).rejects.toThrow();
    });
  });

  describe("number validation", () => {
    it("accepts valid number", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
      });

      const result = await runHandler(input, 42);

      expect(result.variableUpdates).toEqual({ count: 42 });
    });

    it("parses string number", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
      });

      const result = await runHandler(input, "42.5");

      expect(result.variableUpdates).toEqual({ count: 42.5 });
    });

    it("rejects invalid number string", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
      });

      await expect(runHandler(input, "not-a-number")).rejects.toThrow();
    });

    it("rejects number below min", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
        validation: { min: 10 },
      });

      await expect(runHandler(input, 5)).rejects.toThrow();
    });

    it("rejects number above max", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
        validation: { max: 10 },
      });

      await expect(runHandler(input, 15)).rejects.toThrow();
    });

    it("accepts number within range", async () => {
      const input = createInput({
        prompt: "Enter count",
        responseVariable: "count",
        responseType: "number",
        validation: { min: 1, max: 100 },
      });

      const result = await runHandler(input, 50);

      expect(result.variableUpdates).toEqual({ count: 50 });
    });
  });

  describe("choice validation", () => {
    it("accepts valid choice", async () => {
      const input = createInput({
        prompt: "Select option",
        responseVariable: "option",
        responseType: "choice",
        choices: ["a", "b", "c"],
      });

      const result = await runHandler(input, "b");

      expect(result.variableUpdates).toEqual({ option: "b" });
    });

    it("rejects invalid choice", async () => {
      const input = createInput({
        prompt: "Select option",
        responseVariable: "option",
        responseType: "choice",
        choices: ["a", "b", "c"],
      });

      await expect(runHandler(input, "d")).rejects.toThrow();
    });

    it("rejects empty choice when required", async () => {
      const input = createInput({
        prompt: "Select option",
        responseVariable: "option",
        responseType: "choice",
        choices: ["a", "b", "c"],
        validation: { required: true },
      });

      await expect(runHandler(input, "")).rejects.toThrow();
    });
  });

  describe("path validation", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "user-form-test-"));
    });

    afterAll(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it("accepts valid absolute path", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
      });
      const testPath = path.join(tempDir, "test.txt");

      const result = await runHandler(input, testPath);

      expect(result.variableUpdates).toEqual({ filePath: testPath });
    });

    it("rejects relative path", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
      });

      await expect(runHandler(input, "relative/path.txt")).rejects.toThrow();
    });

    it("rejects path with directory traversal", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
      });

      await expect(runHandler(input, "/tmp/../etc/passwd")).rejects.toThrow();
    });

    it("rejects path when parent directory does not exist", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
      });

      await expect(runHandler(input, "/nonexistent/directory/file.txt")).rejects.toThrow();
    });

    it("rejects empty path when required", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
        validation: { required: true },
      });

      await expect(runHandler(input, "")).rejects.toThrow();
    });

    it("accepts empty path when not required", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
        validation: { required: false },
      });

      const result = await runHandler(input, "");

      expect(result.variableUpdates).toEqual({ filePath: "" });
    });

    it("rejects path when mustExist is true and path does not exist", async () => {
      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
        pathConfig: { mustExist: true },
      });
      const nonExistentPath = path.join(tempDir, "nonexistent.txt");

      await expect(runHandler(input, nonExistentPath)).rejects.toThrow();
    });

    it("accepts path when mustExist is true and path exists", async () => {
      const existingPath = path.join(tempDir, "existing.txt");
      await fs.promises.writeFile(existingPath, "test content");

      const input = createInput({
        prompt: "Enter path",
        responseVariable: "filePath",
        responseType: "path",
        pathConfig: { mustExist: true },
      });

      const result = await runHandler(input, existingPath);

      expect(result.variableUpdates).toEqual({ filePath: existingPath });
    });
  });

  describe("relative-path validation", () => {
    it("accepts valid simple relative path", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, "docs");

      expect(result.variableUpdates).toEqual({ outputPath: "docs" });
    });

    it("accepts valid nested relative path", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, "_bmad-output/planning");

      expect(result.variableUpdates).toEqual({
        outputPath: "_bmad-output/planning",
      });
    });

    it("accepts hidden folder paths", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, ".chiron");

      expect(result.variableUpdates).toEqual({ outputPath: ".chiron" });
    });

    it("accepts nested hidden folder paths", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, "config/.hidden-folder");

      expect(result.variableUpdates).toEqual({
        outputPath: "config/.hidden-folder",
      });
    });

    it("rejects path with directory traversal (..)", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "docs/../secrets")).rejects.toThrow(
        "Path cannot contain '..' (directory traversal)",
      );
    });

    it("rejects absolute path starting with /", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "/etc/passwd")).rejects.toThrow(
        "Path must be relative, not absolute",
      );
    });

    it("rejects path with double slashes", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "docs//artifacts")).rejects.toThrow(
        "Path cannot contain double slashes",
      );
    });

    it("rejects path with invalid characters (<>)", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "docs/<file>")).rejects.toThrow(
        'Path cannot contain < > : " | ? *',
      );
    });

    it("rejects path with invalid characters (|?*)", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "file|name")).rejects.toThrow(
        'Path cannot contain < > : " | ? *',
      );
    });

    it("rejects Windows reserved name CON", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "CON")).rejects.toThrow("Path contains reserved name 'CON'");
    });

    it("rejects Windows reserved name in path segment", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "docs/NUL/file")).rejects.toThrow(
        "Path contains reserved name 'NUL'",
      );
    });

    it("rejects Windows reserved name COM1", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "COM1")).rejects.toThrow("Path contains reserved name 'COM1'");
    });

    it("rejects Windows reserved name LPT3", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      await expect(runHandler(input, "LPT3")).rejects.toThrow("Path contains reserved name 'LPT3'");
    });

    it("rejects empty path when required", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
        validation: { required: true },
      });

      await expect(runHandler(input, "")).rejects.toThrow("Path is required");
    });

    it("accepts empty path when not required", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
        validation: { required: false },
      });

      const result = await runHandler(input, "");

      expect(result.variableUpdates).toEqual({ outputPath: "" });
    });

    it("allows paths with underscore prefix", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, "_bmad-output");

      expect(result.variableUpdates).toEqual({ outputPath: "_bmad-output" });
    });

    it("allows paths with dashes and underscores", async () => {
      const input = createInput({
        prompt: "Enter output path",
        responseVariable: "outputPath",
        responseType: "relative-path",
      });

      const result = await runHandler(input, "my-project_artifacts/sub-folder");

      expect(result.variableUpdates).toEqual({
        outputPath: "my-project_artifacts/sub-folder",
      });
    });
  });

  describe("validateFolderName utility", () => {
    it("accepts valid folder name", () => {
      const result = validateFolderName("my-project");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts folder name with underscore", () => {
      const result = validateFolderName("my_project");
      expect(result.valid).toBe(true);
    });

    it("accepts hidden folder name (dot prefix)", () => {
      const result = validateFolderName(".chiron");
      expect(result.valid).toBe(true);
    });

    it("accepts dot-prefixed with numbers", () => {
      const result = validateFolderName(".config123");
      expect(result.valid).toBe(true);
    });

    it("rejects empty folder name", () => {
      const result = validateFolderName("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Folder name is required");
    });

    it("rejects folder name with invalid chars", () => {
      const result = validateFolderName("my<project>");
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Folder name cannot contain < > : " | ? *');
    });

    it("rejects Windows reserved name CON", () => {
      const result = validateFolderName("CON");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("'CON' is a reserved system name");
    });

    it("rejects Windows reserved name nul (case-insensitive)", () => {
      const result = validateFolderName("nul");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("'NUL' is a reserved system name");
    });

    it("rejects Windows reserved name COM1", () => {
      const result = validateFolderName("COM1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("'COM1' is a reserved system name");
    });

    it("rejects folder name starting with invalid character", () => {
      const result = validateFolderName("-invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Folder name must start with a letter, number, or dot");
    });

    it("rejects folder name exceeding max length", () => {
      const longName = "a".repeat(256);
      const result = validateFolderName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Folder name is too long (max 255 characters)");
    });

    it("accepts max length folder name (255 chars)", () => {
      const maxName = "a".repeat(255);
      const result = validateFolderName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe("legacy adapter", () => {
    it("createLegacyUserFormHandler works with legacy interface", async () => {
      const handler = createLegacyUserFormHandler();
      const step = {
        config: {
          prompt: "Enter name",
          responseVariable: "name",
          responseType: "string",
        },
        nextStepNumber: 2,
      };

      const result = await handler.executeStep(step, {}, "John");

      expect(result.output).toEqual({ name: "John" });
      expect(result.nextStepNumber).toBe(2);
      expect(result.requiresUserInput).toBe(false);
    });

    it("legacy adapter returns requiresUserInput when no input", async () => {
      const handler = createLegacyUserFormHandler();
      const step = {
        config: {
          prompt: "Enter name",
          responseVariable: "name",
          responseType: "string",
        },
        nextStepNumber: 2,
      };

      const result = await handler.executeStep(step, {});

      expect(result.requiresUserInput).toBe(true);
    });
  });
});
