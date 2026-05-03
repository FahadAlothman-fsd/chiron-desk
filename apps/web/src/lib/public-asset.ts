export function resolvePublicAsset(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(normalizedPath, `${window.location.origin}/`).href;
  }

  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}
