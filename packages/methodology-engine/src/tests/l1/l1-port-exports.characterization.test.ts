import { describe, expect, it } from "vitest";
import * as MethodologyEngine from "../../index";

describe("L1 layered port exports characterization", () => {
  it("exports VersionRepository from package surface", () => {
    expect("VersionRepository" in MethodologyEngine).toBe(true);
  });

  it("exports MethodologyTx from package surface", () => {
    expect("MethodologyTx" in MethodologyEngine).toBe(true);
  });
});
