# External integrations and repair guide

Keep assumptions about external sites in `src/integrations`. Keep application models in `src/models`, feature behavior in `src/features` or `src/lib`, and state in `src/stores`.

## Where to fix a breaking change

| Symptom                                                         | Repair location                                         |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| poe.ninja endpoint, timeout, or headers changed                 | `integrations/poe-ninja/http.ts`                        |
| Item category or economy page slug changed                      | `integrations/poe-ninja/categories.ts`, `links.ts`      |
| Item price fields or sparkline schema changed                   | `integrations/poe-ninja/items.ts`                       |
| Currency overview format changed                                | `integrations/poe-ninja/currency.ts`                    |
| Caching, request sharing, or category fetching needs adjustment | `integrations/poe-ninja/client.ts`, `currencyRatios.ts` |
| Trade URL layout or encoded query changed                       | `integrations/poe-trade/location.ts`, `searchQuery.ts`  |
| Trade responses are no longer captured                          | `integrations/poe-trade/capture.ts`                     |
| Captured item fields changed                                    | `integrations/poe-trade/decode.ts`                      |
| Search inputs cannot be identified                              | `integrations/poe-trade/searchInputs.ts`                |
| Filter values do not apply or multiselect selection breaks      | `integrations/poe-trade/search.ts`                      |
| Filter panels do not expand                                     | `integrations/poe-trade/expandFilters.ts`               |
| Result rows, prices, mods, or insertion points changed          | `integrations/poe-trade/results.ts`                     |
| Item-name DOM fallback fails                                    | `integrations/poe-trade/itemIdentity.ts`                |
| Pinned-item clones are incomplete                               | `integrations/poe-trade/snapshots.ts`                   |
| Host result/snapshot enhancement styles break                   | `integrations/poe-trade/results.css`                    |
| Stat filter tag markup changed                                  | `integrations/poe-trade/metaTags.ts`, `searchPanel.ts`  |
| Wiki or PoEDB URL conventions changed                           | `integrations/item-references/links.ts`                 |

Extension-owned selectors such as `.bt-*`, standard browser APIs, and extension UI styles can stay outside integrations. Domain matching and script injection configuration remain in the WXT entrypoints and `wxt.config.ts`.

## Rules for new features

- Add host selectors, response decoders, event conventions, and external URL construction to the corresponding integration. Features call named operations rather than copying selectors.
- Validate external payloads before writing application state. The results store receives typed `ResultEntry` values; it does not interpret raw API responses.
- Import application types from `models`, not from stores or provider response types.
- Keep matching, shortcut syntax, variant labels, and chart presentation outside integrations.
- Preserve saved settings identifiers and cache schemas when renaming modules. Increment cache versions when normalized data becomes incompatible.
- Return an unavailable result when a host element is missing. An unavailable enhancement must not prevent unrelated enhancements from running.
- Use `reportIntegrationIssue` for unexpected schemas or request failures. It logs once per operation per session, without raw payloads, account names, or credentials. Empty categories and missing price history are normal, not schema failures.

## Repair workflow

1. Capture a small, sanitized example of the changed markup or response.
2. Update the corresponding fixture and integration behavior test so the current implementation fails for the actual change.
3. Fix the adapter while keeping the application model and feature interface stable where possible.
4. Run `npm test`, `npm run typecheck`, and the relevant browser build. Verify live behavior in that browser; DOM fixtures cannot reproduce every framework or browser event detail.

The JSON fixtures under each integration are reduced from the supplied trade responses and inspected poe.ninja responses. Trade IDs are replaced with illustrative IDs; unrelated fields are omitted. Existing DOM tests cover filter event handling, expansion, item identity fallback, and result enhancements. Extend these with changed markup when repairing a selector.

The trend UI intentionally hides when no matching data is available. Diagnostics distinguish unexpected integration formats from ordinary absence of data. Requests share cached data and rate limiting stops category fetches; failures do not alter the user's search.

The PoE2 copy fallback and Headhunter regression fixture are informed by [upstream PR #191](https://github.com/exile-center/better-trading/pull/191). Native copy handlers remain in control when the site supplies item text.

Gem discriminators are resolved from the live `/api/trade/data/items` metadata using an absolute page-origin URL. This keeps newly added variants resolvable without maintaining a bundled gem list. If metadata is unavailable, the name is left unresolved rather than guessed from the base gem.

Mageblood trend searches cross-reference poe.ninja `tradeInfo.mod` identifiers and explicit modifier text against the live trade stat catalog. Missing metadata can be supplied by sibling variants of the same item. No leftmost/rightmost stat IDs or full stat labels are hardcoded. The selected 2–5 Flask variant supplies the exact range because the stats catalog identifies stats, not item-specific values, and poe.ninja's bounds can be incomplete. Unresolved metadata is reported rather than guessed.

`tradeStats.ts` stores a reduced catalog (ID, text, type) in extension local storage, separately for PoE1 and PoE2. It refreshes after 24 hours, shares in-flight requests, and uses a stored stale catalog if refreshing fails. The catalog is downloaded and indexed programmatically, not checked into the repository. poe.ninja's internal `statIds` names are not assumed to be GGG trade IDs.

Forbidden Flame/Flesh trends resolve enabled positive stat filters from the encoded search through `poe-trade/uniqueItems/forbiddenJewels.ts` and the cached stat catalog. Both composite stat IDs and option-valued IDs are supported. The matching modifier must reference the opposite jewel. Only explicitly selected passives are matched against poe.ninja's `metadata.passiveName` (or its passive-valued `name`) and jewel-valued `variant`; an unfiltered or unresolved search hides the panel instead of listing every passive.

Unique-item trend descriptions belong in `features/trends/uniqueItems`; their trade-query adapters and tests belong in `integrations/poe-trade/uniqueItems`. Shared gem and link handling stays outside these directories.

The trend panel composes `TrendRow` for presentation and `ApplyVariantButton` for interaction. `features/trends/variantSearch.ts` selects each supported search action together with its tooltip and eligibility; add new variant actions there. Pure Forbidden Jewel selection lives in `poe-trade/uniqueItems/forbiddenPassiveSelection.ts`, while `forbiddenJewels.ts` loads the encoded query and cached catalog. Pure matching does not load browser storage or perform requests.
