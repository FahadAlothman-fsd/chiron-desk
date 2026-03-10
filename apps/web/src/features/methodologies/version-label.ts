export function formatMethodologyVersionLabel(version: {
  displayName?: string | null;
  version?: string | null;
  status?: string | null;
}): string | null {
  const baseLabel = version.displayName ?? version.version ?? null;
  if (!baseLabel) {
    return null;
  }

  if (version.status === "draft" && !baseLabel.toLowerCase().startsWith("draft:")) {
    return `Draft: ${baseLabel}`;
  }

  return baseLabel;
}
