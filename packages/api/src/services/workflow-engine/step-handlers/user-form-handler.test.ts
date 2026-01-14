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
