// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installSearchHistory } from '../../../src/integrations/poe-trade/searchHistory'

const storageKey = 'bt-tab-search-history'
const base = '/trade/search/Standard'
const query = `${base}?q=${encodeURIComponent('{"type":"Amulet"}')}`
const saved = () => JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
const paths = () => saved().map((entry: { url: string }) => new URL(entry.url).pathname)
const reload = vi.fn()
let controller: ReturnType<typeof installSearchHistory>
function start(enabled = true) {
    controller?.stop()
    controller = installSearchHistory(enabled, reload)
}
async function go(delta: number) {
    const count = reload.mock.calls.length + 1
    history.go(delta)
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(count))
    start() // Reloading installs the hook again, preserving session storage and history state.
}
beforeEach(() => {
    sessionStorage.clear()
    history.pushState({ site: 'initial' }, '', `${base}/first`)
    reload.mockClear()
})
afterEach(() => {
    controller?.stop()
    vi.restoreAllMocks()
})

it.each([
    base,
    '/trade/search/xbox/Standard',
    '/trade/search/sony/Standard',
    '/trade2/search/poe2/Standard',
    '/trade2/search/Standard',
])('records changed searches at %s without duplicate, live, or fragment steps', (route) => {
    history.replaceState(null, '', `${route}/first`)
    start()
    const length = history.length
    history.replaceState({ site: 'second' }, '', `${route}/H4sI_encoded-search`)
    history.pushState({ site: 'third' }, '', `${route}/third`)
    history.replaceState({ site: 'updated' }, '')
    history.pushState({ site: 'updated' }, '', `${route}/third`)
    history.replaceState({ site: 'updated' }, '', `${route}/third/live#results`)
    expect(history.length).toBe(length + 2)
    expect(paths()).toEqual([`${route}/first`, `${route}/H4sI_encoded-search`, `${route}/third`])
    expect(history.state.site).toBe('updated')
    history.replaceState({ exchange: true }, '', '/trade/exchange/Standard/exchange-id')
    expect(history.state).toEqual({ exchange: true })
    expect(history.length).toBe(length + 2)
})

it.each([true, false])('canonicalizes query URLs in place (initial load: %s)', (initial) => {
    if (initial) history.replaceState(null, '', query)
    start()
    const length = history.length
    history.replaceState(null, '', query)
    const entries = saved()
    history.replaceState(null, '', `${base}/H4sI_encoded-search`)
    expect(history.length).toBe(length + Number(!initial))
    expect(saved().at(-1).id).toBe(entries.at(-1).id)
    expect(paths().at(-1)).toBe(`${base}/H4sI_encoded-search`)
    history.replaceState(null, '', query.replace('Amulet', 'Belt'))
    expect(saved()).toHaveLength(entries.length + 1)
})

it('restores Back/Forward and branches correctly across repeated visits to the same URL', async () => {
    start()
    history.replaceState(null, '', `${base}/second`)
    history.replaceState(null, '', `${base}/first`)
    const length = history.length
    const onSitePop = vi.fn()
    window.addEventListener('popstate', onSitePop)
    try {
        await go(-1)
        expect(location.pathname).toBe(`${base}/second`)
        await go(1)
        expect(location.pathname).toBe(`${base}/first`)
        await go(-2)
        expect(history.length).toBe(length)
        expect(onSitePop).not.toHaveBeenCalled()
        history.replaceState(null, '', `${base}/branch`)
        expect(paths()).toEqual([`${base}/first`, `${base}/branch`])
    } finally {
        window.removeEventListener('popstate', onSitePop)
    }
})

it('retains 15 records across reloads and prunes branches from evicted entries', async () => {
    start()
    for (let i = 1; i <= 20; i++) history.replaceState(null, '', `${base}/search-${i}`)
    const entries = saved()
    const length = history.length
    expect(entries).toHaveLength(15)
    expect(paths()[0]).toBe(`${base}/search-6`)
    expect(localStorage.getItem(storageKey)).toBeNull()
    start()
    expect(saved()).toEqual(entries)
    await go(-20)
    expect(location.pathname).toBe(`${base}/first`)
    expect(history.length).toBe(length)
    history.replaceState({ site: 'refreshed' }, '')
    expect(saved()).toEqual(entries)
    history.replaceState(null, '', `${base}/branch`)
    expect(paths()).toEqual([`${base}/first`, `${base}/branch`])
})

it('restores the empty form before the first search', async () => {
    history.replaceState(null, '', base)
    start()
    history.replaceState(null, '', `${base}/first`)
    await go(-1)
    expect(location.pathname).toBe(base)
})

it('applies setting changes immediately and leaves navigation alone when disabled', async () => {
    start(false)
    const length = history.length
    history.replaceState({ site: 'disabled' }, '', `${base}/disabled`)
    expect(history.length).toBe(length)
    expect(history.state).toEqual({ site: 'disabled' })
    controller.setEnabled(true)
    history.replaceState(null, '', `${base}/enabled`)
    expect(history.length).toBe(length + 1)
    expect(saved()).toHaveLength(2)
    controller.setEnabled(false)
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    history.back()
    await vi.waitFor(() => expect(location.pathname).toBe(`${base}/disabled`))
    expect(reload).not.toHaveBeenCalled()
})

it('tolerates corrupt or blocked storage and preserves native errors and unusual state', () => {
    sessionStorage.setItem(storageKey, 'invalid json')
    start()
    expect(saved()).toHaveLength(1)
    expect(() => history.replaceState(null, '', 'https://example.com/search')).toThrow()
    history.replaceState(['site-array'], '', `${base}/second`)
    expect(history.state).toEqual(['site-array'])
    expect(saved()).toHaveLength(1)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Blocked')
    })
    const length = history.length
    expect(() => history.replaceState(null, '', `${base}/third`)).not.toThrow()
    expect(history.length).toBe(length + 1)
})

it('restores hooks on cleanup without overwriting later wrappers', () => {
    const push = history.pushState
    const replace = history.replaceState
    start()
    controller.stop()
    expect(history.pushState).toBe(push)
    expect(history.replaceState).toBe(replace)
    start()
    const wrapped = history.replaceState
    const laterWrapper: History['replaceState'] = function (this: History, ...args) {
        return wrapped.apply(this, args)
    }
    history.replaceState = laterWrapper
    controller.stop()
    expect(history.replaceState).toBe(laterWrapper)
    const length = history.length
    history.replaceState(null, '', `${base}/second`)
    expect(history.length).toBe(length)
    history.replaceState = replace
})
