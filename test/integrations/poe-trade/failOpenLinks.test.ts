// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { bookmarkUrl, safeTradeUrl } from '../../../src/integrations/poe-trade/navigation'
import { savedBookmarkLink } from '../../../src/integrations/poe-trade/bookmarkLinks'
import { useSelectedLeague } from '../../../src/integrations/poe-trade/selectedLeagueState'
import { buildTradeUrl } from '../../../src/integrations/poe-trade/urls'
const location = { version: '1' as const, type: 'search', league: 'Standard', slug: 'abc' }
afterEach(() =>
    useSelectedLeague.setState({ league: undefined, enabled: false, version: undefined })
)
it('leaves invalid bookmarks unavailable without throwing and allows valid siblings', () => {
    const invalid = { ...location, slug: '../bad' }
    expect(bookmarkUrl({ location: invalid })).toBeUndefined()
    expect(safeTradeUrl(invalid)).toBeUndefined()
    expect(bookmarkUrl({ location })).toContain('/Standard/abc')
    expect(
        savedBookmarkLink({ id: 'bad', title: 'Repairable', completedAt: null, location: invalid })
    ).toBe('')
})
it('falls back to the saved league when a selected league cannot form a safe URL', () => {
    useSelectedLeague.setState({ enabled: true, version: '1', league: 'not/a/league' })
    expect(bookmarkUrl({ location })).toContain('/Standard/abc')
    expect(safeTradeUrl(location)).toContain('/Standard/abc')
})
it('does not coerce a missing slug into a literal undefined search ID', () => {
    const invalid = { ...location, slug: undefined } as unknown as typeof location
    expect(() => buildTradeUrl(invalid)).toThrow()
    expect(bookmarkUrl({ location: invalid })).toBeUndefined()
})
