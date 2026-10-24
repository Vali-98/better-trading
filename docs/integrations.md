# External integrations and repair guide

Keep assumptions about external sites in `src/integrations`. Keep application models in `src/models`, feature behavior in `src/features` or `src/lib`, and state in `src/stores`.

## Where to fix a breaking change

| Symptom                                                         | Repair location                                        |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| poe.ninja endpoint, timeout, or headers changed                 | `integrations/poe-ninja/http.ts`                       |
| Item category or economy page slug changed                      | `integrations/poe-ninja/categories.ts`, `links.ts`     |
| Item price fields or sparkline schema changed                   | `integrations/poe-ninja/items.ts`                      |
| Currency overview format changed                                | `integrations/poe-ninja/currency.ts`                   |
| Caching, request sharing, or category fetching needs adjustment | `lib/prices/itemPrices.ts`, `currencyRatios.ts`        |
| Trade URL layout or encoded query changed                       | `integrations/poe-trade/location.ts`, `searchQuery.ts` |
| Trade responses are no longer captured                          | `integrations/poe-trade/capture.ts`                    |
| Captured item fields changed                                    | `integrations/poe-trade/decode.ts`                     |
| Search inputs cannot be identified                              | `integrations/poe-trade/searchInputs.ts`               |
| Filter values do not apply or multiselect selection breaks      | `integrations/poe-trade/search.ts`                     |
| Filter panels do not expand                                     | `integrations/poe-trade/expandFilters.ts`              |
| Result rows, prices, mods, or insertion points changed          | `integrations/poe-trade/results.ts`                    |
| Item-name DOM fallback fails                                    | `integrations/poe-trade/itemIdentity.ts`               |
| Pinned-item clones are incomplete                               | `integrations/poe-trade/snapshots.ts`                  |
| Host result/snapshot enhancement styles break                   | `integrations/poe-trade/results.css`                   |
| Stat filter tag markup changed                                  | `integrations/poe-trade/metaTags.ts`, `searchPanel.ts` |
| Wiki or PoEDB URL conventions changed                           | `integrations/item-references/links.ts`                |

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

The trend UI intentionally hides when no matching data is available. Diagnostics distinguish unexpected integration formats from ordinary absence of data. Requests share cached data and rate limiting stops category fetches; failures do not alter the user's search. Each category has its own cache and expiry. Failed refreshes preserve stale category data, and an incomplete overview is not cached as a complete catalog by the UI.

The PoE2 copy fallback and Headhunter regression fixture are informed by [upstream PR #191](https://github.com/exile-center/better-trading/pull/191). Native copy handlers remain in control when the site supplies item text.

Gem discriminators are resolved from the live `/api/trade/data/items` metadata using an absolute page-origin URL. This keeps newly added variants resolvable without maintaining a bundled gem list. If metadata is unavailable, the name is left unresolved rather than guessed from the base gem.

Mageblood trend searches cross-reference poe.ninja `tradeInfo.mod` identifiers and explicit modifier text against the live trade stat catalog. Missing metadata can be supplied by sibling variants of the same item. No leftmost/rightmost stat IDs or full stat labels are hardcoded. The selected 2–5 Flask variant supplies the exact range because the stats catalog identifies stats, not item-specific values, and poe.ninja's bounds can be incomplete. Unresolved metadata is reported rather than guessed.

`tradeStats.ts` stores a reduced catalog (ID, text, type) in extension local storage, separately for PoE1 and PoE2. It refreshes after 24 hours, shares in-flight requests, and uses a stored stale catalog if refreshing fails. The catalog is downloaded and indexed programmatically, not checked into the repository. poe.ninja's internal `statIds` names are not assumed to be GGG trade IDs.

Forbidden Flame/Flesh trends resolve enabled positive stat filters from the encoded search through `poe-trade/uniqueItems/forbiddenJewels.ts` and the cached stat catalog. Both composite stat IDs and option-valued IDs are supported. The matching modifier must reference the opposite jewel. Only explicitly selected passives are matched against poe.ninja's `metadata.passiveName` (or its passive-valued `name`) and jewel-valued `variant`; an unfiltered or unresolved search hides the panel instead of listing every passive.

Unique-item trend descriptions belong in `features/trends/uniqueItems`; their trade-query adapters and tests belong in `integrations/poe-trade/uniqueItems`. Shared gem and link handling stays outside these directories.

The trend panel composes `TrendRow` for presentation and `ApplyVariantButton` for interaction. `features/trends/variantSearch.ts` selects each supported search action together with its tooltip and eligibility; add new variant actions there. Pure Forbidden Jewel selection lives in `poe-trade/uniqueItems/forbiddenPassiveSelection.ts`, while `forbiddenJewels.ts` loads the encoded query and cached catalog. Pure matching does not load browser storage or perform requests.

## Merged Live Searches enhancer

Enable **Merge Live Searches across tabs** in Settings (off by default). Settings changes propagate between trade tabs. Activate Live Search in the destination tab, then open another search in the same game, realm and league. Its toolbar offers **Merge**, beside the native activation button, with a destination selector if needed. The destination opens a subscription and must receive `auth: true` before the source's native subscription is stopped and the destination tab is focused. The source tab stays open. Merge remains visible (disabled when no compatible destination exists). If the source hosts attached searches, it keeps running to preserve them when its main query is added to another tab. Queries already present in the destination are not added again, and their manual pause state is preserved. A paused, connecting, or failed duplicate is not a successful handoff: the source stays active until the destination subscription is connected.

The destination toolbar lists added subscriptions with pause/resume/remove controls. Merge uses a blue enabled state and gray disabled state, sized to the native activation button. Source labels appear at the top of the listing’s left column for both the main search and attached searches. Main-search fetch/XHR responses are observed by query identifier without rewriting their requests. The native search remains controlled by the website's Live Search button. Stopping the main Live Search pauses all attached subscriptions without errors. When the main search authenticates again, compatible attached searches reconnect sequentially, except those manually paused. Individual connection failures and rate limits remain errors with a Retry control. Subscriptions live only in page memory: reload or navigation that replaces the document clears them. When first enabling on an already-live page, deactivate/reactivate Live Search once so its socket can be captured.

Repair locations:

- `models/liveSearch.ts`: application state and subscription statuses.
- `integrations/poe-trade/live/protocol.ts`: search/socket URL formats and notification decoding.
- `integrations/poe-trade/live/transport.ts`: page-world socket interception and token/query URL routing. `lib/liveSearch/session.ts` owns authentication, subscriptions, pause/resume policy, native message forwarding, and the bounded listing queue. `listingRequests.ts` owns fetch/XHR observation, optional URL rewriting, and restoring those hooks. It never invokes trade actions or persists tokens. Added updates are bounded, expire from the queue, and are forwarded one at a time; HTTP 429 pauses all added subscriptions. Native messages and unrelated requests pass through unchanged.
- `integrations/poe-trade/live/page.ts`: native toolbar, listing rows, source labels, and the website's deactivate button.
- `lib/liveSearch/coordinator.ts`, `background.ts`: compatible-tab discovery, authentication-before-handoff, and tab/window focusing. Direct probes handle throttled background tabs and background-worker restarts.
- `features/liveSearch/enhancer.ts`: opt-in lifecycle, cross-tab requests and page bridge messages. `toolbar.ts` owns the native-toolbar view and subscription controls; `liveSearch.css` styles the controls and listing source labels.
- `entrypoints/live-search.ts`: injectable page-world bridge; its resource is declared in `wxt.config.ts`.

Native-renderer reuse was verified in Firefox with two authenticated sockets: forwarding three secondary notifications fetched five listings successfully and all five appeared as native rows while the original search continued receiving updates. Automated tests cover query routing for fetch/XHR, serialization of added updates, pause on rate limiting, scope validation, failed handoffs and cleanup. The full cross-tab controls still require live verification. This depends on the website continuing to accept synthetic socket message events and fetching the supplied result token; those assumptions are isolated in the bridge.

Bookmark action menus offer **Add to live search** when a compatible destination is active, including the current tab. Folder menus offer **Add to live search** for all searches in the folder: use a compatible destination or open the first search in a new live tab, wait for authentication, then add the rest sequentially. When multiple destinations exist, the non-clickable **Add to live search** label has indented buttons for each active tab. Exact duplicate search URLs are collapsed, exchange bookmarks are excluded, and failed additions stop the batch with a partial-completion report. Opening a new destination never closes or stops the source tab. Actions accept up to 500 search bookmarks per batch.

`features/liveSearch/BookmarkLiveAction.tsx` shares a cached destination query across bookmark menus. `lib/liveSearch/bookmarks.ts` owns batch validation, deduplication and first-search bootstrapping; the background supplies tab creation and waits for native authentication. `live/page.ts` activates only a button whose text is **Activate Live Search**, so polling a new destination cannot toggle an already-active search off. Server failures halt the batch, and the bounded listing queue pauses overly broad subscriptions.

## Shared page updates and enhancer isolation

`lib/page/updates.ts` owns page observation: one mutation observer, input/change listeners, and one 500 ms fallback for URL changes and programmatic input values. It batches mutations and publishes a normalized search context. Subscribers share the observer, and the last unsubscribe releases its listeners and timers. Extension-only `bt-*` class changes are ignored to prevent highlight feedback loops. Subscriber failures do not stop other subscribers.

Search decoration, result enhancement, title/history updates, trend search resolution, and live result labels subscribe to this provider. The live-search discovery heartbeat remains separate because it coordinates browser tabs rather than observing page changes. Host selectors for the normalized context belong in `poe-trade/searchPanel.ts` and `searchInputs.ts`.

`features/trends/watchTrendSearch.ts` resolves a new search context with generation checks so late responses cannot replace newer state. Forbidden Jewel resolution is attempted again when the search or selected stat-filter state changes; there is no automatic metadata retry timer. Non-stat property edits do not trigger that retry.

`lib/results/enhancers/isolation.ts` gives each row enhancer its own installation and cleanup boundary. Failed installations roll back their injected nodes; cleanup failures do not stop other cleanups. Pricing loads independently and never delays copy, links, pinning, or highlighting. Failures remain unavailable until a normal reset/settings change rather than repeatedly throwing on every mutation.

Application caching and request-sharing policy lives in `lib/prices`; provider endpoints, response decoding, and category names remain in `integrations/poe-ninja`. Live subscription policy lives in `lib/liveSearch`; host interception and request formats remain in `integrations/poe-trade/live`. Pure functions that interpret GGG query or stat schemas remain in the trade integration, even when they do not perform I/O.

Bookmark deletion is owned by `lib/bookmarks/storage.ts`. It saves the folder removal first and then removes its content key. A failed first write preserves all contents; a failed cleanup can leave unreachable data but cannot leave an existing folder whose contents were erased. Cross-tab bookmark mutations still use whole-array writes; concurrent-write coordination is intentionally deferred.
