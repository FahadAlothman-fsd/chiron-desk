import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));
const dbPackageRoot = join(workspaceRoot, "packages", "db");
const outputDir = join(desktopRoot, "build", "runtime-template");
const outputDb = join(outputDir, "chiron.db");

await mkdir(outputDir, { recursive: true });
await rm(outputDb, { force: true });

execFileSync(process.execPath, ["run", "db:push"], {
  cwd: dbPackageRoot,
  env: {
    ...process.env,
    DATABASE_URL: `file:${outputDb}`,
  },
  stdio: "inherit",
});
