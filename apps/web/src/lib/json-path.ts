/**
 * Frontend JSON Path Utility
 *
 * Extract values from objects using dot notation paths.
 * Lightweight version for frontend use.
 */

export function getValueByPath<T = unknown>(
  obj: Record<string, unknown> | unknown,
  path: string,
  defaultValue?: T,
): T | undefined {
  if (obj == null || !path || path.trim() === "") {
    return defaultValue;
  }

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined ? (current as T) : defaultValue;
}
