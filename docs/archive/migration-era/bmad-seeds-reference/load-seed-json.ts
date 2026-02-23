import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  BmadTransitionAllowedSeedFile,
  BmadWorkflowDefinitionsSeedFile,
} from "./types";

const WORKFLOW_FILE = "chiron-seed-workflow-definitions-v1.json";
const BINDINGS_FILE = "chiron-seed-transition-allowed-workflows-v1.json";

function resolvePlanningArtifactPath(fileName: string): string {
  const candidates = [
    resolve(process.cwd(), "../../_bmad-output/planning-artifacts", fileName),
    resolve(process.cwd(), "../_bmad-output/planning-artifacts", fileName),
    resolve(process.cwd(), "_bmad-output/planning-artifacts", fileName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `BMAD seed artifact not found: ${fileName}. Checked: ${candidates.join(", ")}`,
  );
}

function readJsonFile<T>(filePath: string): T {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export function loadBmadWorkflowDefinitionsSeed(): BmadWorkflowDefinitionsSeedFile {
  const filePath = resolvePlanningArtifactPath(WORKFLOW_FILE);
  return readJsonFile<BmadWorkflowDefinitionsSeedFile>(filePath);
}

export function loadBmadTransitionAllowedSeed(): BmadTransitionAllowedSeedFile {
  const filePath = resolvePlanningArtifactPath(BINDINGS_FILE);
  return readJsonFile<BmadTransitionAllowedSeedFile>(filePath);
}
