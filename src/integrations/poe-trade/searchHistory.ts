import { currentLocation } from './location'

const stateKey = '__betterTradingSearchHistory'

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
    let active = true
    let navigating = false
    let previous = searchLocation(location.href)?.url
    let previousId = entryId(history.state)
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
        // without maintaining a separate URL cache. Never push while traversing history.
        navigating = true
        event.stopImmediatePropagation()
        reload()
    }
    window.addEventListener('popstate', onPopState, true)
    if (enabled) replace.call(history, history.state, '')
    return {
        setEnabled(value: boolean) {
            if (enabled === value) return
            enabled = value
            previous = searchLocation(location.href)?.url
            if (enabled) replace.call(history, history.state, '')
        },
        stop() {
            active = false
            if (history.pushState === push) history.pushState = originalPush
            if (history.replaceState === replace) history.replaceState = originalReplace
            window.removeEventListener('popstate', onPopState, true)
        },
    }
}
