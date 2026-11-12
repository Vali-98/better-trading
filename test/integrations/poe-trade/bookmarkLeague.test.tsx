// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readBookmarkLeague } from '../../../src/integrations/poe-trade/bookmarkLeague'
import { bookmarkUrl, safeTradeUrl } from '../../../src/integrations/poe-trade/navigation'
import { buildTradeUrl } from '../../../src/integrations/poe-trade/urls'
import { useBookmarkLeague } from '../../../src/features/bookmarks/hooks/useBookmarkLeague'
import { parseLiveSearch } from '../../../src/integrations/poe-trade/live/protocol'
const trade = { location: { version: '1' as const, type: 'search', slug: 'saved' } }
function markup(league = 'Covens', platform = 'PoE 1 PC') {
    document.body.innerHTML = `<div id="trade"><div class="multiselect status-select"><span class="multiselect__single">${platform}</span></div><div class="multiselect status-select"><span class="multiselect__single">${league}</span><ul><li class="multiselect__element"><span class="multiselect__option">Standard</span></li><li class="multiselect__element"><span class="multiselect__option">Covens</span></li></ul></div><div class="multiselect status-select"><span class="multiselect__single">Instant Buyout</span></div></div>`
}
beforeEach(() => window.history.replaceState({}, '', '/trade/search/Standard/current'))
afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})
it('uses the component for bookmarks and live launches without rewriting stored searches or history', () => {
    markup()
    const before = JSON.stringify(trade)
    expect(readBookmarkLeague()).toEqual({ league: 'Covens' })
    expect(bookmarkUrl(trade)).toContain('/Covens/saved')
    expect(bookmarkUrl(trade, { live: true })).toContain('/Covens/saved/live')
    expect(parseLiveSearch(bookmarkUrl(trade)!).scope).toContain('/Covens')
    expect(safeTradeUrl({ ...trade.location, league: 'Standard' })).toContain('/Standard/saved')
    expect(JSON.stringify(trade)).toBe(before)
})
it.each(['', 'null', 'undefined'])(
    'does not fall back to a stale URL when the selection is %j',
    (value) => {
        markup(value)
        expect(readBookmarkLeague().warning).toContain('Select a league')
        expect(bookmarkUrl(trade)).toBeUndefined()
    }
)
it('warns when a selected league is absent from a populated option list', () => {
    markup('Future League')
    expect(readBookmarkLeague().warning).toContain('isn’t listed')
    expect(bookmarkUrl(trade)).toBeUndefined()
})
it('keeps a valid selection usable when options have not loaded', () => {
    markup()
    document.querySelector('ul')!.remove()
    expect(readBookmarkLeague()).toEqual({ league: 'Covens' })
})
it.each([
    ['PoE 1 Xbox', 'xbox/Covens'],
    ['PoE 1 Sony', 'sony/Covens'],
])('derives the realm from %s', (platform, league) => {
    markup('Covens', platform)
    expect(readBookmarkLeague()).toEqual({ league })
})
it('preserves the PoE 2 PC realm and rejects a mismatched game selector', () => {
    window.history.replaceState({}, '', '/trade2/search/poe2/Standard/current')
    markup('Covens', 'PoE 2 PC')
    expect(readBookmarkLeague()).toEqual({ league: 'poe2/Covens' })
    markup('Covens', 'PoE 1 PC')
    expect(readBookmarkLeague().league).toBeUndefined()
})
it('falls back safely when the component is absent or cannot be read', () => {
    expect(readBookmarkLeague()).toEqual({ league: 'Standard' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(document, 'querySelectorAll').mockImplementation(() => {
        throw new Error('Host changed')
    })
    expect(readBookmarkLeague()).toEqual({ league: 'Standard' })
})
it.each([
    '/trade',
    '/trade/search/null/current',
    '/trade/search/undefined/current',
    '/trade/search/xbox/undefined/current',
])('does not construct links for an invalid URL league: %s', (path) => {
    window.history.replaceState({}, '', path)
    expect(bookmarkUrl(trade)).toBeUndefined()
})
it.each(['null', 'undefined', 'xbox/null', ' ', 'Covens?x=1'])(
    'strict URL building rejects %j',
    (league) => {
        expect(() => buildTradeUrl({ ...trade.location, league })).toThrow()
    }
)
it('refreshes rendered links and notices after DOM changes without URL navigation', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers()
    markup()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    let renders = 0
    function Harness() {
        const league = useBookmarkLeague()
        useEffect(() => {
            renders++
        })
        return (
            <>
                <p>{league.warning}</p>
                <a href={bookmarkUrl(trade)}>Saved</a>
            </>
        )
    }
    try {
        await act(async () => root.render(<Harness />))
        expect(container.querySelector('a')!.href).toContain('/Covens/saved')
        const selected = document.querySelectorAll('#trade .multiselect__single')[1]
        await act(async () => {
            selected.textContent = ''
            await vi.advanceTimersByTimeAsync(10)
        })
        expect(container.querySelector('p')!.textContent).toContain('Select a league')
        expect(container.querySelector('a')!.hasAttribute('href')).toBe(false)
        await act(async () => {
            selected.textContent = 'Standard'
            await vi.advanceTimersByTimeAsync(510)
        })
        expect(container.querySelector('a')!.href).toContain('/Standard/saved')
        expect(container.querySelector('p')!.textContent).toBe('')
        const stable = renders
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000)
        })
        expect(renders).toBe(stable)
        expect(window.location.pathname).toBe('/trade/search/Standard/current')
    } finally {
        await act(async () => root.unmount())
        expect(vi.getTimerCount()).toBe(0)
    }
})
