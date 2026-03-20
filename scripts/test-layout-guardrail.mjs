import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Result } from "better-result";

const root = process.cwd();
const roots = [join(root, "apps"), join(root, "packages")];
const violations = [];

const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".worktrees",
  "worktrees",
]);

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      walk(join(dir, entry.name));
      continue;
    }

    if (!entry.isFile()) continue;

    const fullPath = join(dir, entry.name);
    if (!/\.test\.(ts|tsx)$/.test(entry.name)) continue;

    const normalized = fullPath.split(sep).join("/");
    if (!normalized.includes("/src/")) continue;

    if (!normalized.includes("/src/tests/")) {
      violations.push(relative(root, fullPath).split(sep).join("/"));
    }
  }
}

for (const scanRoot of roots) {
  const statResult = Result.try({
    try: () => statSync(scanRoot),
    catch: () => null,
  });

  if (statResult.isErr() || !statResult.value || !statResult.value.isDirectory()) {
    continue;
  }

  walk(scanRoot);
}

if (violations.length > 0) {
  console.error("❌ Test layout guardrail failed.");
  console.error("All app/package test files under src/ must live in src/tests/**.");
  console.error("Found violations:");
  for (const file of violations.sort()) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log("✅ Test layout guardrail passed (all src test files are under src/tests/**).");
