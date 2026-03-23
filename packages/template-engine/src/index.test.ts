import { describe, it, expect } from "bun:test";
import {
  render,
  validateTemplateHelpers,
  listAllowedHelpers,
  TemplateEngineError,
} from "./index.js";

describe("template-engine", () => {
  describe("render", () => {
    it("renders markdown artifact template with allowlisted helpers", () => {
      const template = `# {{title}}

{{#if description}}
## Description
{{description}}
{{/if}}

{{#each items}}
- {{this}}
{{/each}}`;

      const result = render(template, {
        title: "Project Plan",
        description: "A detailed plan",
        items: ["Item 1", "Item 2"],
      });

      expect(result.output).toContain("# Project Plan");
      expect(result.output).toContain("## Description");
      expect(result.output).toContain("A detailed plan");
      expect(result.output).toContain("- Item 1");
      expect(result.output).toContain("- Item 2");
      expect(result.diagnostics).toHaveLength(0);
    });

    it("rejects missing variables in strict mode", () => {
      const template = `{{missingVar}}`;

      expect(() => render(template, {}, { strict: true })).toThrow(TemplateEngineError);
    });

    it("rejects denied helpers in strict mode", () => {
      const template = `{{#customHelper}}content{{/customHelper}}`;

      expect(() => render(template, {}, { strict: true })).toThrow(TemplateEngineError);
    });

    it("returns diagnostics for denied helpers in relaxed mode", () => {
      const template = `{{#customHelper}}content{{/customHelper}}`;

      const result = render(template, {}, { strict: false });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.type).toBe("denied_helper");
      expect(result.diagnostics[0]?.message).toContain("customHelper");
    });

    it("handles dot-path variable lookups", () => {
      const template = `{{artifact.name}} - {{artifact.status}}`;

      const result = render(template, {
        artifact: {
          name: "Test Artifact",
          status: "draft",
        },
      });

      expect(result.output).toContain("Test Artifact");
      expect(result.output).toContain("draft");
    });

    it("handles comparison helpers", () => {
      const template = `{{#if (eq status "active")}}Active{{else}}Inactive{{/if}}`;

      const result1 = render(template, { status: "active" });
      expect(result1.output).toContain("Active");

      const result2 = render(template, { status: "inactive" });
      expect(result2.output).toContain("Inactive");
    });

    it("handles boolean helpers", () => {
      const template = `{{#if (and flag1 flag2)}}Both true{{/if}}`;

      const result = render(template, { flag1: true, flag2: true });
      expect(result.output).toContain("Both true");
    });

    it("handles default helper for fallbacks", () => {
      const template = `{{default value "fallback"}}`;

      const result1 = render(template, { value: "provided" });
      expect(result1.output).toContain("provided");

      const result2 = render(template, {});
      expect(result2.output).toContain("fallback");
    });
  });

  describe("validateTemplateHelpers", () => {
    it("returns empty array for allowed helpers only", () => {
      const template = `{{#if condition}}content{{/if}}`;
      const denied = validateTemplateHelpers(template);
      expect(denied).toHaveLength(0);
    });

    it("returns denied helper names", () => {
      const template = `{{#customHelper}}content{{/customHelper}}`;
      const denied = validateTemplateHelpers(template);
      expect(denied).toContain("customHelper");
    });
  });

  describe("listAllowedHelpers", () => {
    it("returns phase-1 allowlist", () => {
      const helpers = listAllowedHelpers();
      expect(helpers).toContain("if");
      expect(helpers).toContain("each");
      expect(helpers).toContain("eq");
      expect(helpers).toContain("and");
      expect(helpers).toContain("default");
    });
  });
});
