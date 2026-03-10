import { describe, expect, it } from "vitest";

import { formatMethodologyVersionLabel } from "./version-label";

describe("formatMethodologyVersionLabel", () => {
  it("prefixes draft versions so draft status is explicit", () => {
    expect(
      formatMethodologyVersionLabel({
        displayName: "BMAD V1",
        version: "v2-draft",
        status: "draft",
      }),
    ).toBe("Draft: BMAD V1");
  });

  it("leaves non-draft version labels unchanged", () => {
    expect(
      formatMethodologyVersionLabel({
        displayName: "BMAD V1",
        version: "v1",
        status: "active",
      }),
    ).toBe("BMAD V1");
  });
});
