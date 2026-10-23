import type { QueryClient } from "@tanstack/react-query";
import { getValue, setValue } from "./storage";
import { currentLocation, getFolders, getTrades } from "./bookmarks/storage";
import { recommendTitle } from "./searchPanel";

export interface HistoryEntry {
  id: string;
  version: "1" | "2";
  type: string;
  league: string;
  slug: string;
  title: string;
  createdAt: string;
}
export async function getHistory() {
  return ((await getValue<HistoryEntry[]>("trade-history")) ?? []).map(
    (entry) => ({ ...entry, version: entry.version ?? "1" }),
  );
}
export function startPageController(client: QueryClient) {
  let previous = "";
  let stopped = false;
  let title = "";
  let base = document.title.replace(/^\(\d+\) /, "");
  let running = false;
  let titleTimer: ReturnType<typeof setTimeout> | undefined;
  async function update() {
    if (running || stopped || !document.hasFocus()) return;
    running = true;
    try {
      if (previous !== location.pathname) {
        previous = location.pathname;
        void client.invalidateQueries({ queryKey: ["bookmarks"] });
        const context = currentLocation();
        if (context.slug && context.type && context.league) {
          const history = await getHistory();
          if (
            !history[0] ||
            ["version", "type", "league", "slug"].some(
              (key) =>
                history[0][key as keyof HistoryEntry] !==
                context[key as keyof typeof context],
            )
          ) {
            await setValue(
              "trade-history",
              [
                {
                  ...context,
                  id: crypto.randomUUID(),
                  title: recommendTitle(),
                  createdAt: new Date().toISOString(),
                },
                ...history,
              ].slice(0, 50),
            );
            void client.invalidateQueries({ queryKey: ["history"] });
          }
        }
      }
      const context = currentLocation();
      const folders = await getFolders();
      const matches = (
        await Promise.all(
          folders
            .sort(
              (a, b) =>
                Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)),
            )
            .map(async (folder) =>
              (await getTrades(folder.id))
                .filter(
                  (trade) =>
                    trade.location.version === context.version &&
                    trade.location.type === context.type &&
                    trade.location.slug === context.slug,
                )
                .sort((a, b) => a.title.localeCompare(b.title)),
            ),
        )
      ).flat();
      const segment =
        matches[0]?.title ||
        (context.type === "search" ? recommendTitle() : "");
      title = `${location.pathname.endsWith("/live") ? "⚡ " : ""}${segment ? segment + " - " : ""}${base}`;
      writeTitle();
    } finally {
      running = false;
    }
  }
  function writeTitle() {
    if (stopped || !title) return;
    const count = document.title.match(/^\(\d+\) /)?.[0] ?? "";
    if (document.title !== count + title) document.title = count + title;
  }
  // The trade site or another extension can also own the title. Yield between
  // corrections rather than fighting it indefinitely inside mutation microtasks.
  const observer = new MutationObserver(() => {
    if (titleTimer !== undefined) return;
    titleTimer = setTimeout(() => {
      titleTimer = undefined;
      writeTitle();
    }, 100);
  });
  const node = document.querySelector("title");
  if (node) observer.observe(node, { childList: true });
  const interval = setInterval(() => {
    void update().catch(() => {});
  }, 500);
  void update().catch(() => {});
  return () => {
    stopped = true;
    clearInterval(interval);
    clearTimeout(titleTimer);
    observer.disconnect();
  };
}
