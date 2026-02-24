import { describe, it, expect } from "bun:test";
import { validateLifecycleDefinition } from "./lifecycle-validation";
import type { AgentTypeDefinition } from "@chiron/contracts/methodology/agent";
import type { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";

describe("lifecycle-validation", () => {
  const timestamp = "2026-01-01T00:00:00Z";

  describe("AC 5: Duplicate and Undefined Reference Detection", () => {
    it("should reject duplicate state IDs", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "todo", displayName: "To Do" },
            { key: "todo", displayName: "Duplicate To Do" }, // Duplicate
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "DUPLICATE_STATE_ID")).toBe(true);
    });

    it("should reject duplicate transition keys", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "todo", displayName: "To Do" },
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "complete",
              fromState: "todo",
              toState: "done",
              gateClass: "completion_gate",
              requiredLinks: [],
            },
            {
              transitionKey: "complete", // Duplicate
              fromState: "todo",
              toState: "done",
              gateClass: "completion_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "DUPLICATE_TRANSITION_KEY")).toBe(true);
    });

    it("should reject undefined fromState references", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "todo", displayName: "To Do" },
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "complete",
              fromState: "undefined_state", // Undefined
              toState: "done",
              gateClass: "completion_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "UNDEFINED_FROM_STATE_REFERENCE")).toBe(
        true,
      );
    });

    it("should reject undefined toState references", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "todo", displayName: "To Do" },
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "complete",
              fromState: "todo",
              toState: "undefined_state", // Undefined
              gateClass: "completion_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "UNDEFINED_TO_STATE_REFERENCE")).toBe(true);
    });
  });

  describe("AC 6: Cardinality Validation", () => {
    it("should reject invalid cardinality values", () => {
      const workUnitTypes = [
        {
          key: "task",
          cardinality: "invalid_cardinality", // Invalid
          lifecycleStates: [{ key: "active", displayName: "Active" }],
          lifecycleTransitions: [],
          factSchemas: [],
        },
      ] as WorkUnitTypeDefinition[];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "INVALID_CARDINALITY")).toBe(true);
    });

    it("should accept valid cardinality values", () => {
      const validCardinalities = ["one_per_project", "many_per_project"];

      for (const cardinality of validCardinalities) {
        const workUnitTypes: WorkUnitTypeDefinition[] = [
          {
            key: "task",
            cardinality: cardinality as "one_per_project" | "many_per_project",
            lifecycleStates: [{ key: "active", displayName: "Active" }],
            lifecycleTransitions: [],
            factSchemas: [],
          },
        ];

        const result = validateLifecycleDefinition(workUnitTypes, timestamp);
        const cardinalityError = result.diagnostics.find((d) => d.scope === "task.cardinality");
        expect(cardinalityError).toBeUndefined();
      }
    });
  });

  describe("AC 7: Fact Schema Validation", () => {
    it("should reject duplicate fact schema keys", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [{ key: "active", displayName: "Active" }],
          lifecycleTransitions: [],
          factSchemas: [
            { key: "priority", factType: "string", required: true },
            { key: "priority", factType: "number", required: true }, // Duplicate
          ],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "DUPLICATE_FACT_KEY")).toBe(true);
    });

    it("should reject unsupported fact types", () => {
      const workUnitTypes = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [{ key: "active", displayName: "Active" }],
          lifecycleTransitions: [],
          factSchemas: [
            { key: "data", factType: "array", required: true }, // Invalid type
          ],
        },
      ] as WorkUnitTypeDefinition[];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "UNSUPPORTED_FACT_TYPE")).toBe(true);
    });

    it("should accept valid fact types", () => {
      const validTypes = ["string", "number", "boolean", "json"];

      for (const factType of validTypes) {
        const workUnitTypes: WorkUnitTypeDefinition[] = [
          {
            key: "task",
            cardinality: "one_per_project",
            lifecycleStates: [{ key: "active", displayName: "Active" }],
            lifecycleTransitions: [],
            factSchemas: [
              {
                key: "field",
                factType: factType as "string" | "number" | "boolean" | "json",
                required: true,
              },
            ],
          },
        ];

        const result = validateLifecycleDefinition(workUnitTypes, timestamp);
        const factTypeError = result.diagnostics.find(
          (d) => d.scope === "task.factSchemas[0].factType",
        );
        expect(factTypeError).toBeUndefined();
      }
    });
  });

  describe("AC 9: Gate Class Validation", () => {
    it("should reject invalid gate classes", () => {
      const workUnitTypes = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "todo", displayName: "To Do" },
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "complete",
              fromState: "todo",
              toState: "done",
              gateClass: "invalid_gate", // Invalid
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ] as WorkUnitTypeDefinition[];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "INVALID_GATE_CLASS")).toBe(true);
    });

    it("should accept valid gate classes", () => {
      const validClasses = ["start_gate", "completion_gate"];

      for (const gateClass of validClasses) {
        const workUnitTypes: WorkUnitTypeDefinition[] = [
          {
            key: "task",
            cardinality: "one_per_project",
            lifecycleStates: [
              { key: "todo", displayName: "To Do" },
              { key: "done", displayName: "Done" },
            ],
            lifecycleTransitions: [
              {
                transitionKey: "complete",
                fromState: "todo",
                toState: "done",
                gateClass: gateClass as "start_gate" | "completion_gate",
                requiredLinks: [],
              },
            ],
            factSchemas: [],
          },
        ];

        const result = validateLifecycleDefinition(workUnitTypes, timestamp);
        const gateClassError = result.diagnostics.find(
          (d) => d.scope === "task.lifecycleTransitions[0].gateClass",
        );
        expect(gateClassError).toBeUndefined();
      }
    });
  });

  describe("AC 10: __absent__ Directionality", () => {
    it("should reject defined_state -> __absent__ transitions", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "active", displayName: "Active" },
            { key: "archived", displayName: "Archived" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "deactivate",
              fromState: "active",
              toState: "__absent__", // Invalid direction
              gateClass: "completion_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "INVALID_ABSENT_TRANSITION_DIRECTION")).toBe(
        true,
      );
    });

    it("should allow __absent__ -> defined_state transitions", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "one_per_project",
          lifecycleStates: [{ key: "active", displayName: "Active" }],
          lifecycleTransitions: [
            {
              transitionKey: "activate",
              fromState: undefined, // __absent__
              toState: "active",
              gateClass: "start_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      // Should not have INVALID_ABSENT_DIRECTION error
      expect(result.diagnostics.some((d) => d.code === "INVALID_ABSENT_DIRECTION")).toBe(false);
    });
  });

  describe("Determinism: AC 5, 11", () => {
    it("should return deterministic diagnostics ordering", () => {
      // Create input with multiple errors in non-deterministic order
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "b_task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "state1", displayName: "State 1" },
            { key: "state1", displayName: "Duplicate State" }, // Duplicate
          ],
          lifecycleTransitions: [
            {
              transitionKey: "trans1",
              fromState: "undefined_ref", // Undefined
              toState: "state1",
              gateClass: "invalid_gate", // Invalid
              requiredLinks: [],
            },
          ],
          factSchemas: [
            { key: "fact1", factType: "invalid", required: true }, // Invalid
          ],
        },
        {
          key: "a_task",
          cardinality: "one_per_project",
          lifecycleStates: [
            { key: "state1", displayName: "State 1" },
            { key: "state1", displayName: "Duplicate" }, // Duplicate
          ],
          lifecycleTransitions: [],
          factSchemas: [],
        },
      ];

      // Run validation multiple times
      const results = [
        validateLifecycleDefinition(workUnitTypes, timestamp),
        validateLifecycleDefinition(workUnitTypes, timestamp),
        validateLifecycleDefinition(workUnitTypes, timestamp),
      ];

      // All results should have identical diagnostics order
      const firstDiagnostics = JSON.stringify(results[0].diagnostics);
      expect(JSON.stringify(results[1].diagnostics)).toBe(firstDiagnostics);
      expect(JSON.stringify(results[2].diagnostics)).toBe(firstDiagnostics);

      // Should be sorted by scope then code
      for (let i = 1; i < results[0].diagnostics.length; i++) {
        const prev = results[0].diagnostics[i - 1];
        const curr = results[0].diagnostics[i];
        const scopeCmp = prev.scope.localeCompare(curr.scope);
        expect(scopeCmp <= 0).toBe(true);
        if (scopeCmp === 0) {
          expect(prev.code.localeCompare(curr.code) <= 0).toBe(true);
        }
      }
    });
  });

  describe("Agent Type Validation", () => {
    it("rejects duplicate agent type keys", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [];
      const agentTypes: AgentTypeDefinition[] = [
        {
          key: "architect",
          displayName: "Prometheus",
          persona: "Design architecture",
        },
        {
          key: "architect",
          displayName: "Duplicate",
          persona: "Duplicate persona",
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp, undefined, agentTypes);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "DUPLICATE_AGENT_TYPE_KEY")).toBe(true);
    });

    it("rejects invalid model references", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [];
      const agentTypes: AgentTypeDefinition[] = [
        {
          key: "developer",
          persona: "Implement features",
          defaultModel: {
            provider: "",
            model: "claude-sonnet",
          },
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp, undefined, agentTypes);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === "INVALID_MODEL_REFERENCE")).toBe(true);
    });
  });

  describe("Valid Lifecycle Success", () => {
    it("should pass valid complete lifecycle definition", () => {
      const workUnitTypes: WorkUnitTypeDefinition[] = [
        {
          key: "task",
          cardinality: "many_per_project",
          lifecycleStates: [
            { key: "backlog", displayName: "Backlog" },
            { key: "in_progress", displayName: "In Progress" },
            { key: "review", displayName: "In Review" },
            { key: "done", displayName: "Done" },
          ],
          lifecycleTransitions: [
            {
              transitionKey: "start",
              fromState: undefined, // __absent__ -> backlog
              toState: "backlog",
              gateClass: "start_gate",
              requiredLinks: [],
            },
            {
              transitionKey: "pickup",
              fromState: "backlog",
              toState: "in_progress",
              gateClass: "start_gate",
              requiredLinks: [],
            },
            {
              transitionKey: "submit",
              fromState: "in_progress",
              toState: "review",
              gateClass: "completion_gate",
              requiredLinks: [],
            },
            {
              transitionKey: "approve",
              fromState: "review",
              toState: "done",
              gateClass: "completion_gate",
              requiredLinks: [],
            },
          ],
          factSchemas: [
            { key: "title", factType: "string", required: true },
            { key: "description", factType: "string", required: false },
            { key: "priority", factType: "number", required: true },
            { key: "metadata", factType: "json", required: false },
            { key: "is_urgent", factType: "boolean", required: false },
          ],
        },
      ];

      const result = validateLifecycleDefinition(workUnitTypes, timestamp);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });
  });
});
