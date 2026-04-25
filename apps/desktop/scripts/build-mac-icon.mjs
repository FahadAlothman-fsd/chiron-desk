import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceIcon = fileURLToPath(
  new URL("../../web/public/visuals/chiron-brand/asset-41.svg", import.meta.url),
);
const buildDir = join(desktopRoot, "build");
const outputIcon = join(buildDir, "icon.png");
const croppedViewBox = "18 18 114 114";

if (process.platform !== "darwin") {
  console.error("build-mac-icon.mjs must run on macOS");
  process.exit(1);
}

await mkdir(buildDir, { recursive: true });

const croppedSvg = join(buildDir, "icon-source.svg");

const svgSource = await readFile(sourceIcon, "utf8");
const croppedSvgSource = svgSource
  .replace('width="150px" height="150px"', 'width="1024px" height="1024px"')
  .replace('viewBox="0 0 150 150"', `viewBox="${croppedViewBox}"`);

await writeFile(croppedSvg, croppedSvgSource, "utf8");

execFileSync("sips", ["-s", "format", "png", croppedSvg, "--out", outputIcon]);
execFileSync("sips", ["-z", "1024", "1024", outputIcon, "--out", outputIcon]);
