import { chmod, copyFile, cp, mkdir, readFile, readdir, realpath, rm } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Result } from "better-result";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const serverRoot = dirname(scriptDir);
const workspaceRoot = dirname(dirname(serverRoot));
const distDir = join(serverRoot, "dist");
const bundledNodeModulesDir = join(distDir, "node_modules");
const nativePackageNamespace = "@libsql";
const nativePackageName = "linux-x64-gnu";
const desktopDbPackageDir = join(distDir, "node_modules", "@chiron", "db");
const serverNodeModulesDir = join(serverRoot, "node_modules");
const serverPackage = JSON.parse(await readFile(join(serverRoot, "package.json"), "utf8"));
const copiedPackages = new Set();

await mkdir(distDir, { recursive: true });

const buildResult = await Bun.build({
  entrypoints: [join(serverRoot, "src/index.ts")],
  format: "esm",
  minify: true,
  outdir: distDir,
  packages: "bundle",
  target: "bun",
});

if (!buildResult.success) {
  for (const log of buildResult.logs) {
    console.error(log);
  }

  process.exit(1);
}

await copyFile(join(distDir, "index.mjs"), join(distDir, "server.mjs"));

await rm(bundledNodeModulesDir, { force: true, recursive: true });

for (const dependencyName of Object.keys(serverPackage.dependencies ?? {})) {
  await copyRuntimePackage(join(serverNodeModulesDir, dependencyName));
}

await rm(desktopDbPackageDir, { force: true, recursive: true });
await mkdir(dirname(desktopDbPackageDir), { recursive: true });
await cp(join(workspaceRoot, "packages", "db"), desktopDbPackageDir, {
  dereference: true,
  filter: (source) => filterPackageCopy(source, join(workspaceRoot, "packages", "db")),
  recursive: true,
});

await copyPackageDependencies(desktopDbPackageDir);

const bunBinaryPath = process.execPath;
await copyFile(bunBinaryPath, join(distDir, "bun"));
await chmod(join(distDir, "bun"), 0o755);

const cacheDir = execFileSync(process.execPath, ["pm", "cache"], {
  cwd: serverRoot,
  encoding: "utf8",
}).trim();

const nativeNamespaceDir = join(cacheDir, nativePackageNamespace);
const cacheEntries = await readdir(nativeNamespaceDir);
const nativeCacheEntry = cacheEntries
  .filter((entry) => entry.startsWith(`${nativePackageName}@`))
  .sort((left, right) => right.localeCompare(left))[0];

if (!nativeCacheEntry) {
  throw new Error(`Missing Bun cache entry for ${nativePackageNamespace}/${nativePackageName}`);
}

const bundledNativeDir = join(distDir, "node_modules", nativePackageNamespace, nativePackageName);
await rm(bundledNativeDir, { force: true, recursive: true });
await mkdir(dirname(bundledNativeDir), { recursive: true });
await cp(join(nativeNamespaceDir, nativeCacheEntry), bundledNativeDir, { recursive: true });

async function copyRuntimePackage(packagePath) {
  const packageDir = await realpath(packagePath);
  const packageJson = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
  const packageName = packageJson.name;

  if (copiedPackages.has(packageName)) {
    return;
  }

  copiedPackages.add(packageName);

  const bundledPackageDir = join(bundledNodeModulesDir, packageName);
  await rm(bundledPackageDir, { force: true, recursive: true });
  await mkdir(dirname(bundledPackageDir), { recursive: true });
  await cp(packageDir, bundledPackageDir, {
    dereference: true,
    filter: (source) => filterPackageCopy(source, packageDir),
    recursive: true,
  });

  await copyPackageDependencies(packageDir);
}

async function copyPackageDependencies(packageDir) {
  const packageJson = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
  const owningNodeModulesDir = findOwningNodeModulesDir(packageDir);

  for (const dependencyName of dependencyNames) {
    const localDependencyPath = join(packageDir, "node_modules", dependencyName);
    const siblingDependencyPath = owningNodeModulesDir
      ? join(owningNodeModulesDir, dependencyName)
      : null;

    const localCopyResult = await Result.tryPromise({
      try: async () => {
        await copyRuntimePackage(localDependencyPath);
      },
      catch: (error) => error,
    });

    if (localCopyResult.isOk()) {
      continue;
    }

    if (
      !(
        localCopyResult.error &&
        typeof localCopyResult.error === "object" &&
        "code" in localCopyResult.error &&
        localCopyResult.error.code === "ENOENT"
      )
    ) {
      throw localCopyResult.error;
    }

    if (!siblingDependencyPath) {
      continue;
    }

    const siblingCopyResult = await Result.tryPromise({
      try: async () => {
        await copyRuntimePackage(siblingDependencyPath);
      },
      catch: (error) => error,
    });

    if (
      siblingCopyResult.isErr() &&
      !(
        siblingCopyResult.error &&
        typeof siblingCopyResult.error === "object" &&
        "code" in siblingCopyResult.error &&
        siblingCopyResult.error.code === "ENOENT"
      )
    ) {
      throw siblingCopyResult.error;
    }
  }
}

function findOwningNodeModulesDir(packageDir) {
  let currentDir = dirname(packageDir);

  while (currentDir !== dirname(currentDir)) {
    if (basename(currentDir) === "node_modules") {
      return currentDir;
    }

    currentDir = dirname(currentDir);
  }

  return null;
}

function filterPackageCopy(source, packageRoot) {
  const relativeSource = relative(packageRoot, source);

  return relativeSource !== "node_modules" && !relativeSource.startsWith(`node_modules${sep}`);
}
