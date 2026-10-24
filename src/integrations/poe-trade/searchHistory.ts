import { currentLocation } from './location'

const storageKey = 'bt-tab-search-history'
const stateKey = '__betterTradingSearchHistory'
const limit = 15

interface Entry {
    id: string
    url: string
}

function searchLocation(value: string | URL) {
    try {
        const url = new URL(value, location.href)
        const { version, type, league, slug } = currentLocation(url.pathname)
        const base = `/trade${version === '2' ? '2' : ''}/search/${league}`
        const path = `${base}${slug ? `/${slug}` : ''}`
        if (
            url.origin !== location.origin ||
            type !== 'search' ||
            !league ||
            url.pathname.replace(/\/live\/?$|\/$/, '') !== path
        )
            return
        // Live mode and fragment changes belong to the same search.
        const query = url.searchParams.get('q')
        if (!slug && !query) return
        return { url: `${url.origin}${path}${url.search}`, base, query }
    } catch {
        return
    }
}

function canTag(state: unknown): state is Record<string, unknown> | null {
    return state === null || Object.getPrototypeOf(state ?? {}) === Object.prototype
}

function entryId(state: unknown): string | undefined {
    if (!state || typeof state !== 'object' || !(stateKey in state)) return
    return typeof state[stateKey] === 'string' ? state[stateKey] : undefined
}

// Runs in the page world: content-script History hooks cannot intercept the site in Firefox.
export function installSearchHistory(enabled = true, reload = () => location.reload()) {
    const originalPush = history.pushState
    const originalReplace = history.replaceState
    let entries: Entry[] = []
    let active = true
    let navigating = false
    let previous = searchLocation(location.href)?.url
    let previousId = entryId(history.state)
    try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
        if (Array.isArray(saved))
            entries = saved
                .filter(
                    (entry): entry is Entry =>
                        entry &&
                        typeof entry.id === 'string' &&
                        typeof entry.url === 'string' &&
                        searchLocation(entry.url)?.url === entry.url
                )
                .slice(-limit)
    } catch {
        // Blocked or corrupt storage must not prevent searching.
    }
    const save = () => {
        try {
            if (enabled) sessionStorage.setItem(storageKey, JSON.stringify(entries))
            else sessionStorage.removeItem(storageKey)
        } catch {
            // Native history still works when session storage is unavailable.
        }
    }
    const remember = (id: string, url: string, branchFrom?: Entry) => {
        if (branchFrom) {
            const index = entries.findIndex((entry) => entry.id === branchFrom.id)
            entries = index < 0 ? [branchFrom] : entries.slice(0, index + 1)
        }
        const entry = entries.find((entry) => entry.id === id)
        if (entry) entry.url = url
        else entries.push({ id, url })
        entries = entries.slice(-limit)
        save()
    }
    const wrap = (original: History['pushState']): History['pushState'] =>
        function (this: History, state, unused, url) {
            if (!active || !enabled || navigating || this !== history || !canTag(state))
                return original.call(this, state, unused, url)
            const next = url == null ? searchLocation(location.href) : searchLocation(url)
            if (!next) {
                const result = original.call(this, state, unused, url)
                previous = undefined
                previousId = undefined
                return result
            }
            const current = searchLocation(location.href)
            const currentId = entryId(history.state)
            // The site turns an incoming ?q= query into its canonical slug after searching.
            const canonical = current?.query && !next.query && current.base === next.base
            const changed = current?.url !== next.url && !canonical
            const id = (!changed && currentId) || crypto.randomUUID()
            const method = changed ? originalPush : originalReplace
            // Only record a navigation after the browser accepts it (e.g. same-origin checks).
            method.call(this, { ...state, [stateKey]: id }, unused, url)
            // Reloading or updating an evicted entry must not reorder its forward history.
            if (
                changed ||
                !currentId ||
                !entries.length ||
                entries.some((entry) => entry.id === id)
            )
                remember(
                    id,
                    next.url,
                    changed && current && currentId
                        ? { id: currentId, url: current.url }
                        : undefined
                )
            previous = next.url
            previousId = id
        }
    const push = wrap(originalPush)
    const replace = wrap(originalReplace)
    history.pushState = push
    history.replaceState = replace

    const onPopState = (event: PopStateEvent) => {
        const current = searchLocation(location.href)?.url
        const id = entryId(event.state)
        if (!active || !enabled || navigating || (current === previous && id === previousId)) return
        const wasSearch = previous !== undefined
        previous = current
        previousId = id
        if (!wasSearch && !id) return
        // The site need not understand our entries. Reload to restore both filters and results,
        // including entries older than our bounded cache. Never push while traversing history.
        navigating = true
        event.stopImmediatePropagation()
        reload()
    }
    window.addEventListener('popstate', onPopState, true)
    if (enabled) replace.call(history, history.state, '')
    else save()
    return {
        setEnabled(value: boolean) {
            if (enabled === value) return
            enabled = value
            entries = []
            previous = searchLocation(location.href)?.url
            if (enabled) replace.call(history, history.state, '')
            save()
        },
        stop() {
            active = false
            if (history.pushState === push) history.pushState = originalPush
            if (history.replaceState === replace) history.replaceState = originalReplace
            window.removeEventListener('popstate', onPopState, true)
        },
    }
}
