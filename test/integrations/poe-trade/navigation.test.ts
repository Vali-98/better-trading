import { afterEach, expect, it, vi } from 'vitest'
import {
    bookmarkUrl,
    liveSearchUrl,
    tradeUrl,
    replaceSearchQuery,
} from '../../../src/integrations/poe-trade/navigation'
import { decodeSearchQuery } from '../../../src/integrations/poe-trade/encodedQuery'
import { currentLocation } from '../../../src/integrations/poe-trade/location'
afterEach(() => vi.unstubAllGlobals())
it.each([
    ['1', 'Standard', 'https://www.pathofexile.com/trade/search/Standard/query'],
    [
        '2',
        'poe2/Forbidden Rites',
        'https://www.pathofexile.com/trade2/search/poe2/Forbidden%20Rites/query',
    ],
    [
        '1',
        'xbox/Some%20League',
        'https://www.pathofexile.com/trade/search/xbox/Some%20League/query',
    ],
] as const)('builds PoE%s URLs without double-encoding leagues', (version, league, expected) => {
    expect(tradeUrl({ version, league, type: 'search', slug: 'query' })).toBe(expected)
    expect(liveSearchUrl(expected + '/live')).toBe(expected + '/live')
})
it('resolves bookmark leagues separately from saved bookmark identities', () => {
    vi.stubGlobal('location', { pathname: '/trade2/search/poe2/Forbidden%20Rites/current' })
    expect(
        bookmarkUrl({ location: { version: '2', type: 'search', slug: 'saved' } }, { live: true })
    ).toBe('https://www.pathofexile.com/trade2/search/poe2/Forbidden%20Rites/saved/live')
})
it('rejects unsafe destinations and live exchange links', () => {
    const destination = {
        version: '1' as const,
        type: 'exchange',
        league: 'Standard',
        slug: 'query',
    }
    expect(() => tradeUrl(destination, { live: true })).toThrow('Only item searches')
    expect(() => liveSearchUrl('https://example.com/trade/search/Standard/query')).toThrow(
        'Invalid trade origin'
    )
    expect(() => tradeUrl({ ...destination, slug: '../query' })).toThrow(
        'Invalid trade destination'
    )
})
it('replaces the query, exits live mode, and preserves other URL fields', async () => {
    const source = new URL(
        'https://www.pathofexile.com/trade/search/xbox/Some%20League/original/live?foo=bar#results'
    )
    const assign = vi.fn()
    vi.stubGlobal('location', { href: source.href, pathname: source.pathname, assign })
    await replaceSearchQuery({ name: 'Mageblood', stats: [] }, source.href)
    const target = new URL(assign.mock.calls[0][0])
    expect(target.search).toBe('?foo=bar')
    expect(target.hash).toBe('#results')
    expect(target.pathname.endsWith('/live')).toBe(false)
    const context = currentLocation(target.pathname)
    expect(context.league).toBe('xbox/Some%20League')
    expect(await decodeSearchQuery(context.slug)).toEqual({ name: 'Mageblood', stats: [] })
})
it('does not navigate if the user changes searches during asynchronous encoding', async () => {
    const original = 'https://www.pathofexile.com/trade/search/Standard/original'
    const assign = vi.fn()
    const location = { href: original, assign }
    vi.stubGlobal('location', location)
    const pending = replaceSearchQuery({ name: 'Mageblood' }, original)
    location.href = 'https://www.pathofexile.com/trade/search/Standard/new'
    await expect(pending).rejects.toThrow('search changed')
    expect(assign).not.toHaveBeenCalled()
})

it('leaves bookmark links unavailable until the page has a league', () => {
    vi.stubGlobal('location', { pathname: '/trade' })
    expect(
        bookmarkUrl({ location: { version: '1', type: 'search', slug: 'saved' } })
    ).toBeUndefined()
})

it('guards asynchronous feature-specific query work as well as encoding', async () => {
    const { encodeSearchQuery } = await import('../../../src/integrations/poe-trade/encodedQuery')
    const { updateSearchQuery } = await import('../../../src/integrations/poe-trade/navigation')
    const slug = await encodeSearchQuery({ name: 'Mageblood', stats: [] })
    const source = new URL(`https://www.pathofexile.com/trade/search/Standard/${slug}`)
    const assign = vi.fn()
    const pageLocation = { href: source.href, pathname: source.pathname, assign }
    vi.stubGlobal('location', pageLocation)
    let begin!: () => void
    let finish!: () => void
    const started = new Promise<void>((resolve) => {
        begin = resolve
    })
    const metadata = new Promise<void>((resolve) => {
        finish = resolve
    })
    const pending = updateSearchQuery(async (query) => {
        begin()
        await metadata
        return { ...query, stats: [{ type: 'and', filters: [] }] }
    })
    await started
    pageLocation.href = 'https://www.pathofexile.com/trade/search/Standard/different'
    finish()
    await expect(pending).rejects.toThrow('search changed')
    expect(assign).not.toHaveBeenCalled()
})
