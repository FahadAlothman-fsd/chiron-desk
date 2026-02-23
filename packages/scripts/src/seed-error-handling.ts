export type SeedErrorType = "missing_tables" | "already_seeded" | "unknown";

const sqliteMissingTablePattern = /no such table/i;
const sqliteConstraintPattern = /SQLITE_CONSTRAINT(?:_(?:PRIMARYKEY|UNIQUE))?/i;

const collectErrorFragments = (value: unknown, depth = 0): string[] => {
  if (value == null || depth > 4) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (typeof value !== "object") {
    return [String(value)];
  }

  const record = value as Record<string, unknown>;
  const next: string[] = [];

  for (const key of ["message", "code", "name", "stack"]) {
    if (key in record && record[key] != null) {
      next.push(String(record[key]));
    }
  }

  if ("cause" in record) {
    next.push(...collectErrorFragments(record.cause, depth + 1));
  }

  return next;
};

export const classifySeedError = (error: unknown): SeedErrorType => {
  const message = [String(error), ...collectErrorFragments(error)].join(" | ");

  if (sqliteMissingTablePattern.test(message)) {
    return "missing_tables";
  }

  if (sqliteConstraintPattern.test(message)) {
    return "already_seeded";
  }

  return "unknown";
};

export const shouldSkipSeedError = (error: unknown, shouldReset: boolean): boolean => {
  if (shouldReset) {
    return false;
  }

  return classifySeedError(error) === "already_seeded";
};
