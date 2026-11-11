import { useSelectedLeague, selectedLeagueOverride } from './selectedLeagueState'
export { useSelectedLeague } from './selectedLeagueState'
import { useSettingsStore } from '../../stores/settings'
import { currentLocation } from './location'
import { parseBookmarkLink } from './bookmarkLinks'
import { buildTradeUrl } from './urls'

export function useTradeLinkRefresh() {
    useSelectedLeague((state) => state.league)
    useSettingsStore((state) => state.disabled)
}
export function readSelectedLeague() {
    const realmSelector = Array.from(
        document.querySelectorAll<HTMLElement>('#trade .multiselect.status-select')
    ).find((element) =>
        /^PoE\s+[12]\s+(PC|Xbox|Sony)$/i.test(
            element.querySelector('.multiselect__single')?.textContent?.trim() ?? ''
        )
    )
    const leagueSelector = realmSelector?.nextElementSibling
    if (leagueSelector?.matches('.multiselect.status-select')) {
        const league = leagueSelector.querySelector('.multiselect__single')?.textContent?.trim()
        if (league) {
            const platform = realmSelector?.querySelector('.multiselect__single')?.textContent ?? ''
            const realm = /Xbox/i.test(platform)
                ? 'xbox'
                : /Sony/i.test(platform)
                  ? 'sony'
                  : currentLocation().league?.startsWith('poe2/')
                    ? 'poe2'
                    : undefined
            return realm ? `${realm}/${league}` : league
        }
    }
    // Deliberately avoid generic multiselect selectors: they also match item/stat filters.
    const node = document.querySelector<HTMLSelectElement | HTMLInputElement>(
        '#trade select[name="league"], #trade select#league, #trade input[name="league"]'
    )
    const value =
        node?.value?.trim() ||
        document
            .querySelector(
                '#trade #league .multiselect__single, #trade .league-select .multiselect__single, #trade .search-league .multiselect__single'
            )
            ?.textContent?.trim()
    if (!value) return undefined
    const realm = currentLocation().league?.split('/')
    return value.includes('/') || realm?.length !== 2 ? value : `${realm[0]}/${value}`
}
export function startSelectedLeagueLinks() {
    const originals = new Map<HTMLAnchorElement, { original: string; rewritten: string }>()
    let scheduled: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    function refresh() {
        scheduled = undefined
        if (stopped) return
        const league = readSelectedLeague()
        const enabledSetting = !useSettingsStore
            .getState()
            .disabled.includes('selected-league-links')
        const state = useSelectedLeague.getState()
        const version = currentLocation().version
        if (
            league !== state.league ||
            enabledSetting !== state.enabled ||
            version !== state.version
        )
            useSelectedLeague.setState({ league, enabled: enabledSetting, version })
        const enabled = selectedLeagueOverride()
        for (const [anchor, saved] of originals) {
            if (!anchor.isConnected) originals.delete(anchor)
            else if (!enabled) {
                if (anchor.href === saved.rewritten) anchor.href = saved.original
                originals.delete(anchor)
            }
        }
        if (!enabled) return
        for (const anchor of document.querySelectorAll<HTMLAnchorElement>('#trade a[href]')) {
            try {
                const saved = originals.get(anchor)
                const source =
                    saved && anchor.href === saved.rewritten ? saved.original : anchor.href
                const destination = parseBookmarkLink(source)
                if (destination.version !== currentLocation().version) continue
                const rewritten = buildTradeUrl(
                    { ...destination, league: enabled },
                    { live: destination.live, origin: new URL(source).origin }
                )
                originals.set(anchor, { original: source, rewritten })
                if (anchor.href !== rewritten) anchor.href = rewritten
            } catch {
                /* Non-trade anchors are untouched. */
            }
        }
    }
    function schedule() {
        if (!stopped && scheduled === undefined) scheduled = setTimeout(refresh, 100)
    }
    const observer = new MutationObserver(schedule)
    const root = document.querySelector('#trade')
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true })
    document.addEventListener('change', schedule, true)
    document.addEventListener('input', schedule, true)
    const unsubscribe = useSettingsStore.subscribe(schedule)
    const interval = setInterval(schedule, 1000)
    refresh()
    return () => {
        stopped = true
        observer.disconnect()
        clearInterval(interval)
        clearTimeout(scheduled)
        unsubscribe()
        document.removeEventListener('change', schedule, true)
        document.removeEventListener('input', schedule, true)
        for (const [anchor, saved] of originals)
            if (anchor.href === saved.rewritten) anchor.href = saved.original
        originals.clear()
        useSelectedLeague.setState({ league: undefined, enabled: false, version: undefined })
    }
}
