# Browser search history

**Browser Back/Forward search history** is enabled by default in Settings for
Chrome and Firefox. Changed trade search URLs become native history entries;
Back/Forward reloads the destination to restore its filters and results. PoE1,
PoE2, realms, short IDs, compressed slugs, and `?q=` searches are supported.
Canonicalization, repeated searches, and live-mode changes do not add search steps.

Up to 15 records are kept per tab in `sessionStorage`. Disabling the setting clears
that cache and stops modifying navigation. The shared History panel is unchanged.
Native history may retain older URLs: the History API cannot remove arbitrary
entries, and Back/Forward is not restricted at the cache boundary.

## Local testing

Build with `npm run build` and `npm run build:firefox` (`npm.cmd` in Windows
PowerShell). Disable other installed copies and refresh existing trade tabs.

- Chrome: open `chrome://extensions`, enable Developer mode, and Load unpacked from `.output/chrome-mv3`.
- Firefox: open `about:debugging#/runtime/this-firefox` and Load Temporary Add-on from `.output/firefox-mv2/manifest.json`.

Check in both browsers:

1. The setting defaults on for new and existing installations. Search for three
   different items, go Back twice and Forward twice, and verify URLs, filters,
   and results. Go Back and run a new search; Forward should be unavailable.
2. `?q=` canonicalization, repeat searches, and live toggles add no duplicate steps.
   Check PoE1/PoE2, realm/league changes, and the merged Live Search controls.
   Back/Forward reloads the page; merged subscriptions are not restored.
3. After more than 15 searches, `JSON.parse(sessionStorage.getItem('bt-tab-search-history')).length`
   stays at most 15. Refresh, traverse to an older search, and branch again;
   abandoned forward searches should leave the cache. Separate tabs stay independent.
4. Disable the setting: subsequent navigation follows the site and
   `sessionStorage.getItem('bt-tab-search-history')` becomes `null`. Re-enable it
   without refreshing. Changing the setting in another tab should also take effect.

Unit tests simulate History API calls in jsdom; production scripts, browser
injection, and content security policy still require live testing.
