import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  CreateDraftVersionInput,
  GetDraftLineageInput,
  LinkStrength,
  MethodologyLinkTypeDefinitionInput,
  MethodologyVariableDefinitionInput,
  MethodologyVersionDefinition,
  MethodologyVersionStatus,
  UpdateDraftVersionInput,
  ValidateDraftVersionInput,
  ValidationDiagnostic,
  ValidationResult,
  VariableValueType,
  VersionEventType,
} from "./version";

const validDefinition = {
  workUnitTypes: [],
  transitions: [],
  allowedWorkflowsByTransition: {},
};

describe("MethodologyVersionStatus", () => {
  const decode = Schema.decodeUnknownSync(MethodologyVersionStatus);

  it("accepts valid status values", () => {
    for (const s of ["draft", "active", "deprecated", "retired"]) {
      expect(decode(s)).toBe(s);
    }
  });

  it("rejects invalid status", () => {
    expect(() => decode("published")).toThrow();
  });
});

describe("VersionEventType", () => {
  const decode = Schema.decodeUnknownSync(VersionEventType);

  it("accepts valid event types", () => {
    for (const t of ["created", "updated", "validated"]) {
      expect(decode(t)).toBe(t);
    }
  });

  it("rejects invalid event type", () => {
    expect(() => decode("deleted")).toThrow();
  });
});

describe("VariableValueType", () => {
  const decode = Schema.decodeUnknownSync(VariableValueType);

  it("accepts all valid types", () => {
    for (const t of ["string", "number", "boolean", "date", "json"]) {
      expect(decode(t)).toBe(t);
    }
  });

  it("rejects invalid type", () => {
    expect(() => decode("array")).toThrow();
  });
});

describe("LinkStrength", () => {
  const decode = Schema.decodeUnknownSync(LinkStrength);

  it("accepts valid strengths", () => {
    for (const s of ["hard", "soft", "context"]) {
      expect(decode(s)).toBe(s);
    }
  });

  it("rejects invalid strength", () => {
    expect(() => decode("weak")).toThrow();
  });
});

describe("ValidationDiagnostic", () => {
  const decode = Schema.decodeUnknownSync(ValidationDiagnostic);

  const validDiagnostic = {
    code: "MISSING_FIELD",
    scope: "definition.workUnitTypes",
    blocking: true,
    required: "Non-empty array of work unit types",
    observed: "Empty array",
    remediation: "Add at least one work unit type to the definition",
    timestamp: "2026-02-24T12:00:00Z",
  };

  it("accepts valid diagnostic with all required fields", () => {
    const result = decode(validDiagnostic);
    expect(result.code).toBe("MISSING_FIELD");
    expect(result.blocking).toBe(true);
  });

  it("accepts diagnostic with optional evidenceRef", () => {
    const result = decode({ ...validDiagnostic, evidenceRef: "event-123" });
    expect(result.evidenceRef).toBe("event-123");
  });

  it("accepts diagnostic without evidenceRef", () => {
    const result = decode(validDiagnostic);
    expect(result.evidenceRef).toBeUndefined();
  });

  it("rejects diagnostic with empty code", () => {
    expect(() => decode({ ...validDiagnostic, code: "" })).toThrow();
  });

  it("rejects diagnostic missing required fields", () => {
    const { remediation: _, ...incomplete } = validDiagnostic;
    expect(() => decode(incomplete)).toThrow();
  });
});

describe("ValidationResult", () => {
  const decode = Schema.decodeUnknownSync(ValidationResult);

  it("accepts valid result with empty diagnostics", () => {
    const result = decode({ valid: true, diagnostics: [] });
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("accepts result with diagnostics array", () => {
    const diag = {
      code: "WARN",
      scope: "root",
      blocking: false,
      required: "x",
      observed: "y",
      remediation: "z",
      timestamp: "2026-01-01T00:00:00Z",
    };
    const result = decode({ valid: false, diagnostics: [diag] });
    expect(result.diagnostics).toHaveLength(1);
  });

  it("rejects missing valid field", () => {
    expect(() => decode({ diagnostics: [] })).toThrow();
  });
});

describe("MethodologyVersionDefinition", () => {
  const decode = Schema.decodeUnknownSync(MethodologyVersionDefinition);

  it("accepts minimal valid definition", () => {
    const result = decode(validDefinition);
    expect(result.workUnitTypes).toEqual([]);
    expect(result.transitions).toEqual([]);
    expect(result.allowedWorkflowsByTransition).toEqual({});
  });

  it("accepts definition with populated arrays", () => {
    const def = {
      workUnitTypes: [{ key: "task" }, { key: "epic" }],
      transitions: [{ key: "start" }],
      allowedWorkflowsByTransition: {
        start: ["review-flow", "auto-flow"],
      },
    };
    const result = decode(def);
    expect(result.workUnitTypes).toHaveLength(2);
    expect(result.allowedWorkflowsByTransition.start).toEqual(["review-flow", "auto-flow"]);
  });

  it("rejects definition missing workUnitTypes", () => {
    const { workUnitTypes: _, ...rest } = validDefinition;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects definition missing transitions", () => {
    const { transitions: _, ...rest } = validDefinition;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects definition missing allowedWorkflowsByTransition", () => {
    const { allowedWorkflowsByTransition: _, ...rest } = validDefinition;
    expect(() => decode(rest)).toThrow();
  });
});

describe("MethodologyVariableDefinitionInput", () => {
  const decode = Schema.decodeUnknownSync(MethodologyVariableDefinitionInput);

  const validVar = {
    key: "priority",
    valueType: "number" as const,
    required: true,
  };

  it("accepts valid variable definition with required fields", () => {
    const result = decode(validVar);
    expect(result.key).toBe("priority");
    expect(result.valueType).toBe("number");
  });

  it("accepts variable definition with all optional fields", () => {
    const full = {
      ...validVar,
      description: "Priority level",
      defaultValue: 1,
      validation: { min: 0, max: 10 },
    };
    const result = decode(full);
    expect(result.description).toBe("Priority level");
  });

  it("rejects variable with empty key", () => {
    expect(() => decode({ ...validVar, key: "" })).toThrow();
  });

  it("rejects variable with invalid valueType", () => {
    expect(() => decode({ ...validVar, valueType: "array" })).toThrow();
  });
});

describe("MethodologyLinkTypeDefinitionInput", () => {
  const decode = Schema.decodeUnknownSync(MethodologyLinkTypeDefinitionInput);

  const validLink = {
    key: "blocks",
    allowedStrengths: ["hard", "soft"] as const,
  };

  it("accepts valid link type definition", () => {
    const result = decode(validLink);
    expect(result.key).toBe("blocks");
    expect(result.allowedStrengths).toEqual(["hard", "soft"]);
  });

  it("accepts link type with optional fields", () => {
    const full = {
      ...validLink,
      description: "Blocking dependency",
      policyMetadata: { cascadeOnClose: true },
    };
    const result = decode(full);
    expect(result.description).toBe("Blocking dependency");
  });

  it("rejects link type with empty key", () => {
    expect(() => decode({ ...validLink, key: "" })).toThrow();
  });

  it("rejects link type with empty allowedStrengths", () => {
    expect(() => decode({ ...validLink, allowedStrengths: [] })).toThrow();
  });

  it("rejects link type with invalid strength", () => {
    expect(() => decode({ ...validLink, allowedStrengths: ["weak"] })).toThrow();
  });
});

describe("CreateDraftVersionInput", () => {
  const decode = Schema.decodeUnknownSync(CreateDraftVersionInput);

  const validInput = {
    methodologyKey: "agile-standard",
    displayName: "Agile Standard",
    version: "1.0.0",
    definition: validDefinition,
  };

  it("accepts valid create input with required fields only", () => {
    const result = decode(validInput);
    expect(result.methodologyKey).toBe("agile-standard");
    expect(result.displayName).toBe("Agile Standard");
    expect(result.version).toBe("1.0.0");
  });

  it("accepts create input with variable definitions", () => {
    const input = {
      ...validInput,
      variableDefinitions: [
        {
          key: "priority",
          valueType: "number",
          required: true,
        },
      ],
    };
    const result = decode(input);
    expect(result.variableDefinitions).toHaveLength(1);
  });

  it("accepts create input with link type definitions", () => {
    const input = {
      ...validInput,
      linkTypeDefinitions: [{ key: "blocks", allowedStrengths: ["hard"] }],
    };
    const result = decode(input);
    expect(result.linkTypeDefinitions).toHaveLength(1);
  });

  it("rejects input with empty methodologyKey", () => {
    expect(() => decode({ ...validInput, methodologyKey: "" })).toThrow();
  });

  it("rejects input with empty displayName", () => {
    expect(() => decode({ ...validInput, displayName: "" })).toThrow();
  });

  it("rejects input with empty version", () => {
    expect(() => decode({ ...validInput, version: "" })).toThrow();
  });

  it("rejects input missing definition", () => {
    const { definition: _, ...rest } = validInput;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects input missing methodologyKey", () => {
    const { methodologyKey: _, ...rest } = validInput;
    expect(() => decode(rest)).toThrow();
  });
});

describe("UpdateDraftVersionInput", () => {
  const decode = Schema.decodeUnknownSync(UpdateDraftVersionInput);

  const validInput = {
    versionId: "ver-123",
    displayName: "Updated Name",
    version: "1.1.0",
    definition: validDefinition,
  };

  it("accepts valid update input", () => {
    const result = decode(validInput);
    expect(result.versionId).toBe("ver-123");
  });

  it("rejects update with empty versionId", () => {
    expect(() => decode({ ...validInput, versionId: "" })).toThrow();
  });

  it("rejects update missing required displayName", () => {
    const { displayName: _, ...rest } = validInput;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects update missing required version", () => {
    const { version: _, ...rest } = validInput;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects update missing required definition", () => {
    const { definition: _, ...rest } = validInput;
    expect(() => decode(rest)).toThrow();
  });
});

describe("ValidateDraftVersionInput", () => {
  const decode = Schema.decodeUnknownSync(ValidateDraftVersionInput);

  it("accepts valid versionId", () => {
    expect(decode({ versionId: "ver-123" }).versionId).toBe("ver-123");
  });

  it("rejects empty versionId", () => {
    expect(() => decode({ versionId: "" })).toThrow();
  });
});

describe("GetDraftLineageInput", () => {
  const decode = Schema.decodeUnknownSync(GetDraftLineageInput);

  it("accepts valid methodologyVersionId", () => {
    expect(decode({ methodologyVersionId: "ver-123" }).methodologyVersionId).toBe("ver-123");
  });

  it("rejects empty methodologyVersionId", () => {
    expect(() => decode({ methodologyVersionId: "" })).toThrow();
  });
});
