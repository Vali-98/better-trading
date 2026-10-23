import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadReleases } from "../src/lib/releases/model";
const root = resolve(import.meta.dirname, "..");
const files: Record<string, string> = {};
const { version } = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
const path = resolve(root, `changelogs/${version}.md`);
files[path] = readFileSync(path, "utf8");
const { releases } = loadReleases(files, version);
console.log(
  `Validated changelog for ${version} (${releases.length} releases).`,
);
