import { browser } from "wxt/browser";
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((request: unknown) => {
    const input = request as {
      query?: string;
      version?: string;
      league?: string;
    };
    if (input?.query !== "currency-ratios") return;
    if (
      !["1", "2"].includes(input.version ?? "") ||
      typeof input.league !== "string"
    )
      return Promise.resolve(null);
    return fetch(
      `https://poe.ninja/poe${input.version}/api/economy/exchange/current/overview?type=Currency&league=${encodeURIComponent(input.league)}`,
      { signal: AbortSignal.timeout(15000) },
    )
      .then((response) => {
        if (!response.ok) throw new Error("Currency request failed");
        return response.json();
      })
      .catch(() => null);
  });
});
