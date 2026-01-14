/**
 * JSON Path Utility
 *
 * Extracts values from objects using dot notation paths.
 * Supports nested object and array access.
 *
 * @example
 * const obj = { name: "John", tags: { role: { value: "admin" } } };
 *
 * getValueByPath(obj, "name") → "John"
 * getValueByPath(obj, "tags.role.value") → "admin"
 * getValueByPath(obj, "tags.missing") → undefined
 * getValueByPath(obj, "tags.missing", "default") → "default"
 */

/**
 * Extract value from object using dot notation path
 *
 * @param obj - The object to extract from
 * @param path - Dot-separated path (e.g., "tags.complexity.name")
 * @param defaultValue - Value to return if path doesn't exist
 * @returns The extracted value or defaultValue
 */
export function getValueByPath<T = unknown>(
  obj: Record<string, unknown> | unknown,
  path: string,
  defaultValue?: T,
): T | undefined {
  // Handle null/undefined object
  if (obj == null) {
    return defaultValue;
  }

  // Handle empty path
  if (!path || path.trim() === "") {
    return defaultValue;
  }

  // Split path by dots and reduce through the object
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    // Handle null/undefined at any point in the chain
    if (current == null) {
      return defaultValue;
    }

    // Type guard: ensure current is an object
    if (typeof current !== "object") {
      return defaultValue;
    }

    // Access the key
    current = (current as Record<string, unknown>)[key];
  }

  // Return the final value, or defaultValue if undefined
  return current !== undefined ? (current as T) : defaultValue;
}

/**
 * Check if a path exists in an object
 *
 * @param obj - The object to check
 * @param path - Dot-separated path
 * @returns True if path exists and has a non-undefined value
 */
export function hasPath(obj: Record<string, unknown> | unknown, path: string): boolean {
  return getValueByPath(obj, path) !== undefined;
}

/**
 * Set a value at a path in an object (creates nested objects as needed)
 * Returns a new object (immutable)
 *
 * @param obj - The object to update
 * @param path - Dot-separated path
 * @param value - Value to set
 * @returns New object with value set at path
 */
export function setValueByPath<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  value: T,
): Record<string, unknown> {
  if (!path || path.trim() === "") {
    return obj;
  }

  const keys = path.split(".");
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  // Navigate to the parent of the target key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    } else {
      // Clone nested object for immutability
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }

    current = current[key] as Record<string, unknown>;
  }

  // Set the final value
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result;
}

/**
 * Extract multiple values from an object using multiple paths
 *
 * @param obj - The object to extract from
 * @param paths - Map of output keys to paths
 * @returns Object with extracted values
 *
 * @example
 * const obj = {
 *   user: { name: "John", email: "john@example.com" },
 *   meta: { created: "2024-01-01" }
 * };
 *
 * extractValues(obj, {
 *   userName: "user.name",
 *   userEmail: "user.email",
 *   createdAt: "meta.created"
 * });
 * // Returns: { userName: "John", userEmail: "john@example.com", createdAt: "2024-01-01" }
 */
export function extractValues(
  obj: Record<string, unknown>,
  paths: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [outputKey, path] of Object.entries(paths)) {
    result[outputKey] = getValueByPath(obj, path);
  }

  return result;
}
