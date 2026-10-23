import { version } from "../../../package.json";
import { loadReleases } from "./model";
import markdown from "#current-changelog?raw";
const files = { [`changelogs/${version}.md`]: markdown };
export const { current: currentRelease, releases } = loadReleases(
  files,
  version,
);
