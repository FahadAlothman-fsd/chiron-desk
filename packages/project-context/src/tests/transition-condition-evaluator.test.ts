import { describe, expect, it } from "vitest";

import { evaluateRuntimeConditions } from "../transition-condition-evaluator";

describe("transition-condition-evaluator", () => {
  it("evaluates project work-unit instance conditions from current instances", () => {
    const result = evaluateRuntimeConditions({
      conditionSets: [
        {
          key: "start",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "group-story-ready",
              mode: "all",
              conditions: [
                {
                  kind: "work_unit",
                  config: {
                    operator: "work_unit_instance_exists_in_state",
                    workUnitTypeKey: "WU.STORY",
                    stateKeys: ["ready"],
                    minCount: 2,
                  },
                },
              ],
            },
          ],
        },
      ],
      factValues: {},
      knownWorkUnitTypeKeys: ["WU.STORY"],
      activeWorkUnitTypeKey: "WU.PROJECT_CONTEXT",
      currentState: "draft",
      workUnitInstances: [
        { workUnitTypeKey: "WU.STORY", currentStateKey: "ready" },
        { workUnitTypeKey: "WU.STORY", currentStateKey: "ready" },
        { workUnitTypeKey: "WU.STORY", currentStateKey: null },
      ],
    });

    expect(result.met).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("fails predictably for unknown work-unit type, empty stateKeys, and invalid minCount", () => {
    const unknownType = evaluateRuntimeConditions({
      conditionSets: [
        {
          key: "start",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "group",
              mode: "all",
              conditions: [
                {
                  kind: "work_unit",
                  config: {
                    operator: "work_unit_instance_exists",
                    workUnitTypeKey: "WU.UNKNOWN",
                  },
                },
              ],
            },
          ],
        },
      ],
      factValues: {},
      knownWorkUnitTypeKeys: ["WU.STORY"],
      activeWorkUnitTypeKey: null,
      currentState: "__absent__",
    });

    expect(unknownType.met).toBe(false);
    expect(unknownType.diagnostics[0]?.observed).toContain("unknown work unit type");

    const emptyStates = evaluateRuntimeConditions({
      conditionSets: [
        {
          key: "start",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "group",
              mode: "all",
              conditions: [
                {
                  kind: "work_unit",
                  config: {
                    operator: "work_unit_instance_exists_in_state",
                    workUnitTypeKey: "WU.STORY",
                    stateKeys: [],
                  },
                },
              ],
            },
          ],
        },
      ],
      factValues: {},
      knownWorkUnitTypeKeys: ["WU.STORY"],
      activeWorkUnitTypeKey: null,
      currentState: "__absent__",
    });

    expect(emptyStates.met).toBe(false);
    expect(emptyStates.diagnostics[0]?.observed).toBe("empty stateKeys");

    const invalidMinCount = evaluateRuntimeConditions({
      conditionSets: [
        {
          key: "start",
          phase: "start",
          mode: "all",
          groups: [
            {
              key: "group",
              mode: "all",
              conditions: [
                {
                  kind: "work_unit",
                  config: {
                    operator: "work_unit_instance_exists",
                    workUnitTypeKey: "WU.STORY",
                    minCount: 0,
                  },
                },
              ],
            },
          ],
        },
      ],
      factValues: {},
      knownWorkUnitTypeKeys: ["WU.STORY"],
      activeWorkUnitTypeKey: null,
      currentState: "__absent__",
    });

    expect(invalidMinCount.met).toBe(false);
    expect(invalidMinCount.diagnostics[0]?.observed).toBe("minCount=0");
  });
});
