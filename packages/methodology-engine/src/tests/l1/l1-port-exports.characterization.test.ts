import { describe, expect, it } from "vitest";
import * as MethodologyEngine from "../../index";

describe("L1 layered port exports characterization", () => {
  it("exports VersionRepository from package surface", () => {
    expect("VersionRepository" in MethodologyEngine).toBe(true);
  });

  it("exports MethodologyTx from package surface", () => {
    expect("MethodologyTx" in MethodologyEngine).toBe(true);
  });

  it("does not export LifecycleService from package surface", () => {
    expect("LifecycleService" in MethodologyEngine).toBe(false);
  });

  it("does not export legacy MethodologyVersionService tag from package surface", () => {
    expect("MethodologyVersionService" in MethodologyEngine).toBe(false);
  });

  it("does not export L1 compatibility layer from package surface", () => {
    expect("MethodologyEngineL1CompatibilityLive" in MethodologyEngine).toBe(false);
  });
});
