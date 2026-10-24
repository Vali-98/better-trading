# Integrations

Website selectors, host events, external URLs, and API formats belong in `src/integrations`. Enhancers call these functions directly; feature decisions and extension UI stay outside integrations.

Paths below are relative to `src/`.

| What broke                                  | Where to look                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Filter names or values                      | `integrations/poe-trade/filterDefinitions.ts`, `search.ts`                            |
| Input discovery or collapsed filters        | `integrations/poe-trade/searchInputs.ts`, `expandFilters.ts`                          |
| Trade URLs or encoded searches              | `integrations/poe-trade/location.ts`, `urls.ts`, `navigation.ts`, `encodedQuery.ts`   |
| Item response capture or decoding           | `integrations/poe-trade/capture.ts`, `decode.ts`                                      |
| Result markup, item links, or pinned clones | `integrations/poe-trade/results.ts`, `itemIdentity.ts`, `snapshots.ts`, `results.css` |
| Item/stat metadata or unique variants       | `integrations/poe-trade/itemTypes.ts`, `tradeStats.ts`, `uniqueItems/`                |
| Live-search sockets or native requests      | `integrations/poe-trade/live/`; coordination lives in `lib/liveSearch/`               |
| poe.ninja endpoints or responses            | `integrations/poe-ninja/`; caching lives in `lib/prices/`                             |
| Wiki or PoEDB links                         | `integrations/item-references/links.ts`                                               |

Tests mirror `src/` under `test/`. Sanitized markup and response fixtures live under `test/integrations/<provider>/fixtures/`.

When repairing an integration, capture a small sanitized example, add a regression test, and fix the adapter. Run `npm test`, `npm run typecheck`, and the relevant browser build. Verify live behaviour too: fixtures cannot reproduce every website or browser event.

Use `reportIntegrationIssue` for unexpected failures. Keep tokens, credentials, seller information, and raw responses out of diagnostics. Missing optional data should leave unrelated enhancements working.
