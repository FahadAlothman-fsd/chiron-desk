import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import * as Runtime from "../../runtime";
import {
  PROJECT_EXECUTIONS_LEGACY_COMPATIBILITY_MODES,
  ProjectExecutionsCompatibility,
  RuntimeExcludedL3Entity,
} from "../../runtime/executions";

describe("runtime cutover and legacy compatibility rules", () => {
  it("keeps project_executions in legacy read-only mode", () => {
    expect(PROJECT_EXECUTIONS_LEGACY_COMPATIBILITY_MODES).toEqual(["legacy_read_only"]);

    const decodeCompatibility = Schema.decodeUnknownSync(ProjectExecutionsCompatibility);

    const decoded = decodeCompatibility({
      table: "project_executions",
      mode: "legacy_read_only",
      writesAllowed: false,
    });

    expect(decoded.table).toBe("project_executions");
    expect(decoded.mode).toBe("legacy_read_only");
    expect(decoded.writesAllowed).toBe(false);

    expect(() =>
      decodeCompatibility({
        table: "project_executions",
        mode: "legacy_read_only",
        writesAllowed: true,
      }),
    ).toThrow();
  });

  it("explicitly excludes step_executions and any L3 step contracts", () => {
    const decodeExcludedEntity = Schema.decodeUnknownSync(RuntimeExcludedL3Entity);
    expect(decodeExcludedEntity("step_executions")).toBe("step_executions");

    const runtimeExportKeys = Object.keys(Runtime);
    expect(runtimeExportKeys.some((key) => /StepExecution/.test(key))).toBe(false);
    expect(runtimeExportKeys.some((key) => /L3Event/.test(key))).toBe(false);
  });
});
