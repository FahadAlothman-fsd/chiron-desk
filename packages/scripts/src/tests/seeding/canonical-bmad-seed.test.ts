import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "file:test.db";
process.env.BETTER_AUTH_SECRET ??= "test-secret-for-canonical-bmad-seed";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.CORS_ORIGIN ??= "http://localhost:3000";

async function loadSeedModule() {
  return import("../../seed/methodology");
}

type Snapshot =
  Awaited<ReturnType<typeof loadSeedModule>> extends infer TModule
    ? TModule extends { buildCanonicalBmadSeedPayload: (...args: any[]) => infer TPayload }
      ? TPayload
      : never
    : never;

function snapshotRows(payload: Snapshot) {
  return Object.fromEntries(
    payloadOrder.map((tableName) => [
      tableName,
      payload.canonicalRows[tableName].map((row) => row.id).toSorted(),
    ]),
  );
}

let payloadOrder: readonly string[] = [];

describe("canonical BMAD seed payload", () => {
  it("builds one canonical BMAD methodology with draft and active versions", async () => {
    const seedModule = await loadSeedModule();
    payloadOrder = seedModule.METHODOLOGY_CANONICAL_TABLE_SEED_ORDER;
    const payload = seedModule.buildCanonicalBmadSeedPayload();

    expect(payload.definition.key).toBe(seedModule.CANONICAL_BMAD_METHODOLOGY_KEY);
    expect(payload.versions).toHaveLength(2);
    expect(payload.versions.map((version) => version.status).toSorted()).toEqual([
      "active",
      "draft",
    ]);
  });

  it("preserves existing methodology and version ids while keeping canonical rows stable", async () => {
    const seedModule = await loadSeedModule();
    payloadOrder = seedModule.METHODOLOGY_CANONICAL_TABLE_SEED_ORDER;
    const payload = seedModule.buildCanonicalBmadSeedPayload({
      existingDefinitionId: "existing-definition-id",
      existingVersions: [
        {
          id: "existing-draft-id",
          methodologyId: "existing-definition-id",
          version: "v1-slice-a-draft",
        },
        {
          id: "existing-active-id",
          methodologyId: "existing-definition-id",
          version: "v1-slice-a",
        },
      ],
    });

    expect(payload.definition.id).toBe("existing-definition-id");
    expect(payload.versions.map((version) => version.id)).toEqual([
      "existing-draft-id",
      "existing-active-id",
    ]);

    for (const tableName of seedModule.METHODOLOGY_CANONICAL_TABLE_SEED_ORDER) {
      if (payload.canonicalRows[tableName].length === 0) {
        continue;
      }

      const rowsWithMethodologyVersionId = payload.canonicalRows[tableName].filter(
        (
          row,
        ): row is (typeof payload.canonicalRows)[typeof tableName][number] & {
          readonly methodologyVersionId: string;
        } =>
          "methodologyVersionId" in row &&
          typeof row.methodologyVersionId === "string" &&
          row.methodologyVersionId.length > 0,
      );

      if (rowsWithMethodologyVersionId.length === 0) {
        continue;
      }

      const versionIds = new Set(
        rowsWithMethodologyVersionId.map((row) => row.methodologyVersionId),
      );
      expect(versionIds).toEqual(new Set(["existing-draft-id", "existing-active-id"]));
    }
  });

  it("is idempotent across repeated payload construction", async () => {
    const seedModule = await loadSeedModule();
    payloadOrder = seedModule.METHODOLOGY_CANONICAL_TABLE_SEED_ORDER;
    const firstPayload = seedModule.buildCanonicalBmadSeedPayload();
    const secondPayload = seedModule.buildCanonicalBmadSeedPayload({
      existingDefinitionId: firstPayload.definition.id,
      existingVersions: firstPayload.versions.map((version) => ({
        id: version.id,
        methodologyId: version.methodologyId,
        version: version.version,
      })),
    });

    expect(secondPayload.definition).toEqual(firstPayload.definition);
    expect(secondPayload.versions).toEqual(firstPayload.versions);
    expect(snapshotRows(secondPayload)).toEqual(snapshotRows(firstPayload));
  });

  it("keeps the in-process seeder separate from manual-seed.mjs", async () => {
    const source = await readFile(
      new URL("../../seed/methodology/canonical-bmad.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("manual-seed.mjs");
    expect(source).not.toMatch(/spawn|execFile|child_process/);
  });
});
