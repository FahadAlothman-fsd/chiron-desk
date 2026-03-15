import { describe, expect, it } from "vitest";
import { resolveBackendUrl } from "../../../main";

describe("backend url resolution", () => {
  it("defaults to the local server url", () => {
    expect(resolveBackendUrl()).toBe("http://localhost:3000");
  });

  it("prefers an explicit backend url override", () => {
    expect(resolveBackendUrl("http://127.0.0.1:4010")).toBe("http://127.0.0.1:4010");
  });
});
