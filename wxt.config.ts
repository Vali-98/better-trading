import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { version } from "./package.json";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Better PathOfExile Trading",
    description: "Enhancements for Path of Exile trading.",
    permissions: ["storage"],
    host_permissions: ["https://poe.ninja/*"],
    web_accessible_resources: [
      {
        resources: ["assets/images/*"],
        matches: ["*://*.pathofexile.com/*", "*://pathofexile.com/*"],
      },
    ],
    icons: { 128: "assets/images/logo.png" },
    browser_specific_settings: { gecko: { id: "better-trading@example.com" } },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      {
        name: "current-changelog",
        resolveId(id) {
          if (id === "#current-changelog?raw") return "\0current-changelog";
        },
        load(id) {
          if (id === "\0current-changelog")
            return `export default ${JSON.stringify(readFileSync(resolve(`changelogs/${version}.md`), "utf8"))}`;
        },
      },
    ],
  }),
});
