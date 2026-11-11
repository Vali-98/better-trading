// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { bookmarkUrl, safeTradeUrl } from '../../../src/integrations/poe-trade/navigation'
import { buildTradeUrl } from '../../../src/integrations/poe-trade/urls'
const location = { version: '1' as const, type: 'search', league: 'Standard', slug: 'abc' }
beforeEach(() => window.history.replaceState({}, '', '/trade/search/Standard/current'))
it('leaves invalid bookmarks unavailable without throwing and allows valid siblings', () => {
    const invalid = { ...location, slug: '../bad' }
    expect(bookmarkUrl({ location: invalid })).toBeUndefined()
    expect(safeTradeUrl(invalid)).toBeUndefined()
    expect(bookmarkUrl({ location })).toContain('/Standard/abc')
})
it('does not coerce a missing slug into a literal undefined search ID', () => {
    const invalid = { ...location, slug: undefined } as unknown as typeof location
    expect(() => buildTradeUrl(invalid)).toThrow()
    expect(bookmarkUrl({ location: invalid })).toBeUndefined()
})
