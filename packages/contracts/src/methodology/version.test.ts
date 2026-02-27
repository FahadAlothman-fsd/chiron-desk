import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  CreateDraftVersionInput,
  GetProjectPinLineageInput,
  GetDraftLineageInput,
  GetPublicationEvidenceInput,
  LinkStrength,
  MethodologyFactDefinitionInput,
  ProjectMethodologyPinEvent,
  ProjectMethodologyPinEventType,
  MethodologyLinkTypeDefinitionInput,
  MethodologyVersionDefinition,
  PinProjectMethodologyVersionInput,
  PublicationEvidence,
  PublishDraftVersionInput,
  RepinProjectMethodologyVersionInput,
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
  agentTypes: [],
  transitions: [],
  workflows: [],
  transitionWorkflowBindings: {},
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
    for (const t of [
      "created",
      "updated",
      "validated",
      "workflows_updated",
      "transition_bindings_updated",
      "guidance_updated",
      "published",
    ]) {
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
    for (const t of ["string", "number", "boolean", "json"]) {
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
    evidenceRef: null,
  };

  it("accepts valid diagnostic with all required fields", () => {
    const result = decode(validDiagnostic);
    expect(result.code).toBe("MISSING_FIELD");
    expect(result.blocking).toBe(true);
  });

  it("accepts diagnostic with evidenceRef", () => {
    const result = decode({ ...validDiagnostic, evidenceRef: "event-123" });
    expect(result.evidenceRef).toBe("event-123");
  });

  it("accepts diagnostic with null evidenceRef", () => {
    const result = decode(validDiagnostic);
    expect(result.evidenceRef).toBeNull();
  });

  it("rejects diagnostic missing evidenceRef", () => {
    const { evidenceRef: _evidenceRef, ...withoutEvidenceRef } = validDiagnostic;
    expect(() => decode(withoutEvidenceRef)).toThrow();
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
      evidenceRef: null,
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
    expect(result.transitionWorkflowBindings).toEqual({});
  });

  it("accepts definition with populated arrays", () => {
    const def = {
      workUnitTypes: [{ key: "task" }, { key: "epic" }],
      transitions: [{ key: "start" }],
      workflows: [{ key: "review-flow", steps: [{ key: "s1", type: "form" }], edges: [] }],
      transitionWorkflowBindings: {
        start: ["review-flow", "auto-flow"],
      },
    };
    const result = decode(def);
    expect(result.workUnitTypes).toHaveLength(2);
    expect(result.transitionWorkflowBindings.start).toEqual(["review-flow", "auto-flow"]);
  });

  it("rejects definition missing workUnitTypes", () => {
    const { workUnitTypes: _, ...rest } = validDefinition;
    expect(() => decode(rest)).toThrow();
  });

  it("rejects definition missing transitions", () => {
    const { transitions: _, ...rest } = validDefinition;
    expect(() => decode(rest)).toThrow();
  });

  it("accepts definition missing transitionWorkflowBindings", () => {
    const { transitionWorkflowBindings: _, ...rest } = validDefinition;
    const result = decode(rest);
    expect(result.transitionWorkflowBindings).toEqual({});
  });
});

describe("MethodologyFactDefinitionInput", () => {
  const decode = Schema.decodeUnknownSync(MethodologyFactDefinitionInput);

  const validVar = {
    key: "priority",
    valueType: "number" as const,
    required: true,
  };

  it("accepts valid fact definition with required fields", () => {
    const result = decode(validVar);
    expect(result.key).toBe("priority");
    expect(result.valueType).toBe("number");
  });

  it("accepts fact definition with all optional fields", () => {
    const full = {
      ...validVar,
      description: "Priority level",
      defaultValue: 1,
      validation: { min: 0, max: 10 },
    };
    const result = decode(full);
    expect(result.description).toBe("Priority level");
  });

  it("rejects fact definition with empty key", () => {
    expect(() => decode({ ...validVar, key: "" })).toThrow();
  });

  it("rejects fact definition with invalid valueType", () => {
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

  it("accepts create input with fact definitions", () => {
    const input = {
      ...validInput,
      factDefinitions: [
        {
          key: "priority",
          valueType: "number",
          required: true,
        },
      ],
    };
    const result = decode(input);
    expect(result.factDefinitions).toHaveLength(1);
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

  it("accepts update with fact definitions", () => {
    const input = {
      ...validInput,
      factDefinitions: [
        {
          key: "priority",
          valueType: "number",
          required: true,
        },
      ],
    };
    const result = decode(input);
    expect(result.factDefinitions).toHaveLength(1);
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

describe("PublishDraftVersionInput", () => {
  const decode = Schema.decodeUnknownSync(PublishDraftVersionInput);

  it("accepts valid publish input", () => {
    const result = decode({ versionId: "ver-123", publishedVersion: "1.0.0" });
    expect(result.versionId).toBe("ver-123");
    expect(result.publishedVersion).toBe("1.0.0");
  });

  it("rejects empty versionId", () => {
    expect(() => decode({ versionId: "", publishedVersion: "1.0.0" })).toThrow();
  });

  it("rejects empty publishedVersion", () => {
    expect(() => decode({ versionId: "ver-123", publishedVersion: "" })).toThrow();
  });
});

describe("GetPublicationEvidenceInput", () => {
  const decode = Schema.decodeUnknownSync(GetPublicationEvidenceInput);

  it("accepts valid methodologyVersionId", () => {
    const result = decode({ methodologyVersionId: "ver-123" });
    expect(result.methodologyVersionId).toBe("ver-123");
  });

  it("rejects empty methodologyVersionId", () => {
    expect(() => decode({ methodologyVersionId: "" })).toThrow();
  });
});

describe("ProjectMethodologyPinEventType", () => {
  const decode = Schema.decodeUnknownSync(ProjectMethodologyPinEventType);

  it("accepts valid event types", () => {
    expect(decode("pinned")).toBe("pinned");
    expect(decode("repinned")).toBe("repinned");
  });

  it("rejects invalid event type", () => {
    expect(() => decode("updated")).toThrow();
  });
});

describe("PinProjectMethodologyVersionInput", () => {
  const decode = Schema.decodeUnknownSync(PinProjectMethodologyVersionInput);

  it("accepts valid pin input", () => {
    const result = decode({
      projectId: "project-1",
      methodologyKey: "delivery",
      publishedVersion: "V1",
    });

    expect(result.projectId).toBe("project-1");
    expect(result.publishedVersion).toBe("V1");
  });

  it("rejects empty identifiers", () => {
    expect(() =>
      decode({
        projectId: "",
        methodologyKey: "delivery",
        publishedVersion: "V1",
      }),
    ).toThrow();
  });
});

describe("RepinProjectMethodologyVersionInput", () => {
  const decode = Schema.decodeUnknownSync(RepinProjectMethodologyVersionInput);

  it("accepts valid repin input", () => {
    const result = decode({
      projectId: "project-1",
      methodologyKey: "delivery",
      publishedVersion: "V2",
    });

    expect(result.projectId).toBe("project-1");
    expect(result.publishedVersion).toBe("V2");
  });

  it("rejects empty target version", () => {
    expect(() =>
      decode({
        projectId: "project-1",
        methodologyKey: "delivery",
        publishedVersion: "",
      }),
    ).toThrow();
  });
});

describe("GetProjectPinLineageInput", () => {
  const decode = Schema.decodeUnknownSync(GetProjectPinLineageInput);

  it("accepts valid query input", () => {
    expect(decode({ projectId: "project-1" }).projectId).toBe("project-1");
  });

  it("rejects empty projectId", () => {
    expect(() => decode({ projectId: "" })).toThrow();
  });
});

describe("ProjectMethodologyPinEvent", () => {
  const decode = Schema.decodeUnknownSync(ProjectMethodologyPinEvent);

  it("accepts valid pin event", () => {
    const result = decode({
      id: "event-1",
      projectId: "project-1",
      eventType: "repinned",
      actorId: "user-1",
      previousVersion: "V1",
      newVersion: "V2",
      timestamp: "2026-02-26T10:00:00Z",
      evidenceRef: "project-pin-event:event-1",
    });

    expect(result.eventType).toBe("repinned");
    expect(result.previousVersion).toBe("V1");
  });

  it("allows null previousVersion for initial pin", () => {
    const result = decode({
      id: "event-1",
      projectId: "project-1",
      eventType: "pinned",
      actorId: "user-1",
      previousVersion: null,
      newVersion: "V1",
      timestamp: "2026-02-26T10:00:00Z",
      evidenceRef: "project-pin-event:event-1",
    });

    expect(result.previousVersion).toBeNull();
  });

  it("rejects missing audit fields", () => {
    expect(() =>
      decode({
        id: "event-1",
        projectId: "project-1",
        eventType: "pinned",
        actorId: "user-1",
        previousVersion: null,
        newVersion: "V1",
        evidenceRef: "project-pin-event:event-1",
      }),
    ).toThrow();
  });
});

describe("PublicationEvidence", () => {
  const decode = Schema.decodeUnknownSync(PublicationEvidence);

  it("accepts valid publication evidence", () => {
    const result = decode({
      actorId: "user-1",
      timestamp: "2026-02-25T10:00:00Z",
      sourceDraftRef: "draft:ver-123",
      publishedVersion: "1.0.0",
      validationSummary: {
        valid: true,
        diagnostics: [],
      },
      evidenceRef: "event-1",
    });

    expect(result.publishedVersion).toBe("1.0.0");
    expect(result.validationSummary.valid).toBe(true);
  });

  it("accepts null actorId", () => {
    const result = decode({
      actorId: null,
      timestamp: "2026-02-25T10:00:00Z",
      sourceDraftRef: "draft:ver-123",
      publishedVersion: "1.0.0",
      validationSummary: {
        valid: true,
        diagnostics: [],
      },
      evidenceRef: "event-1",
    });

    expect(result.actorId).toBeNull();
  });

  it("rejects missing required fields", () => {
    expect(() =>
      decode({
        actorId: "user-1",
        timestamp: "2026-02-25T10:00:00Z",
        publishedVersion: "1.0.0",
        validationSummary: { valid: true, diagnostics: [] },
        evidenceRef: "event-1",
      }),
    ).toThrow();
  });
});
