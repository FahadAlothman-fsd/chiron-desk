import { describe, expect, it } from "vitest";

import { getAvatarAssetForMethodologyIndex } from "../../../features/projects/card-avatar-map";

describe("getAvatarAssetForMethodologyIndex", () => {
  it("maps indices deterministically and cycles every four entries", () => {
    expect(getAvatarAssetForMethodologyIndex(0)).toBe("asset-07");
    expect(getAvatarAssetForMethodologyIndex(1)).toBe("asset-11");
    expect(getAvatarAssetForMethodologyIndex(2)).toBe("asset-26");
    expect(getAvatarAssetForMethodologyIndex(3)).toBe("asset-41");
    expect(getAvatarAssetForMethodologyIndex(4)).toBe("asset-07");
    expect(getAvatarAssetForMethodologyIndex(7)).toBe("asset-41");
  });
});
