export const CANONICAL_TABLE_BACKED_KEYS = [
  "workUnitTypes",
  "agentTypes",
  "transitions",
  "workflows",
  "transitionWorkflowBindings",
  "factDefinitions",
  "linkTypeDefinitions",
] as const;

export type CanonicalTableBackedKey = (typeof CANONICAL_TABLE_BACKED_KEYS)[number];

export const isCanonicalTableBackedKey = (key: string): key is CanonicalTableBackedKey =>
  (CANONICAL_TABLE_BACKED_KEYS as readonly string[]).includes(key);
