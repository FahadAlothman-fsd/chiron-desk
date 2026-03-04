const AVATAR_ASSETS = ["asset-07", "asset-11", "asset-26", "asset-41"] as const;

export type AvatarAsset = (typeof AVATAR_ASSETS)[number];

export function getAvatarAssetForMethodologyIndex(index: number): AvatarAsset {
  return AVATAR_ASSETS[index % AVATAR_ASSETS.length] ?? "asset-07";
}

type MethodologyVersionOption = {
  id: string;
  version: string;
  status: string;
  createdAt: string;
};

export function getLatestPublishedVersion(
  versions: readonly MethodologyVersionOption[],
): MethodologyVersionOption | null {
  const published = versions.filter((version) => version.status === "active");
  if (published.length === 0) {
    return null;
  }

  const ordered = [...published].sort((left, right) => {
    const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    return right.id.localeCompare(left.id);
  });

  return ordered[0] ?? null;
}
