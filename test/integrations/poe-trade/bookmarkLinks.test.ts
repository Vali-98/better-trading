// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({ browser: { storage: { local: {} } } }))
import {
    parseBookmarkLink,
    overrideTradeLeague,
    savedBookmarkLink,
} from '../../../src/integrations/poe-trade/bookmarkLinks'
import { bookmarkUrl } from '../../../src/integrations/poe-trade/navigation'
import {
    useSelectedLeague,
    startSelectedLeagueLinks,
    readSelectedLeague,
} from '../../../src/integrations/poe-trade/selectedLeague'
import { useSettingsStore } from '../../../src/stores/settings'
import { serialize, deserialize } from '../../../src/lib/bookmarks/export'
import type { Trade, Folder } from '../../../src/lib/bookmarks/storage'
const trade: Trade = {
    id: 'a',
    title: 'Test',
    completedAt: null,
    location: { version: '1', type: 'search', slug: 'abc', league: 'xbox/Standard', live: true },
}
const folder: Folder = { id: 'f', title: 'Folder', version: '1', icon: null, archivedAt: null }
beforeEach(() => {
    window.history.replaceState({}, '', '/trade/search/xbox/Standard/current')
    useSettingsStore.setState({ disabled: ['selected-league-links'] })
    useSelectedLeague.setState({ league: undefined, enabled: false, version: undefined })
})
afterEach(() => document.body.replaceChildren())
describe('saved trade links', () => {
    it('updates URLs when the selected league changes and restores them when the enhancer is disabled', async () => {
        document.body.innerHTML =
            '<div id="trade"><select name="league"><option>First</option><option>Second</option></select><a href="https://www.pathofexile.com/trade/search/xbox/Standard/abc/live">Trade</a></div>'
        useSettingsStore.setState({ disabled: [] })
        const stop = startSelectedLeagueLinks()
        try {
            const select = document.querySelector('select')!
            select.value = 'Second'
            select.dispatchEvent(new Event('change', { bubbles: true }))
            await new Promise((resolve) => setTimeout(resolve, 150))
            expect(bookmarkUrl(trade)).toContain('/xbox/Second/abc/live')
            expect(document.querySelector('a')!.href).toContain('/xbox/Second/abc/live')
            useSettingsStore.setState({ disabled: ['selected-league-links'] })
            await new Promise((resolve) => setTimeout(resolve, 150))
            expect(document.querySelector('a')!.href).toContain('/xbox/Standard/abc/live')
            expect(bookmarkUrl(trade)).toContain('/xbox/Standard/abc/live')
        } finally {
            stop()
        }
    })
    it('reads the supplied league dropdown without confusing realm and trade-status values', () => {
        document.body.innerHTML =
            '<div id="trade"><div class="multiselect status-select"><span class="multiselect__single">PoE 1 PC</span></div><div class="multiselect status-select"><span class="multiselect__single">Hardcore</span></div><div class="multiselect status-select"><span class="multiselect__single">Instant Buyout</span></div></div>'
        expect(readSelectedLeague()).toBe('Hardcore')
        document.querySelector('.multiselect__single')!.textContent = 'PoE 1 Xbox'
        expect(readSelectedLeague()).toBe('xbox/Hardcore')
    })
    it('preserves saved league, live mode and console realms', () => {
        expect(parseBookmarkLink(savedBookmarkLink(trade))).toEqual(trade.location)
        expect(overrideTradeLeague(trade, 'New League').location.league).toBe('xbox/New League')
        expect(bookmarkUrl(trade)).toContain('xbox/Standard/abc/live')
    })
    it('rejects unrelated hosts, credentials and unsupported path segments', () => {
        for (const url of [
            'https://example.com/trade/search/Standard/abc',
            'https://user@www.pathofexile.com/trade/search/Standard/abc',
            'https://www.pathofexile.com/trade/search/unknown/Standard/abc',
        ])
            expect(() => parseBookmarkLink(url)).toThrow()
        expect(() => overrideTradeLeague(trade, '')).toThrow()
    })
    it('round-trips new link fields in exports while retaining legacy export support', () => {
        const encoded = serialize(folder, [trade])
        expect(encoded.startsWith('4:')).toBe(true)
        expect(deserialize(encoded).trades[0].location).toEqual(trade.location)
        const old = { ...trade, location: { version: '1' as const, type: 'search', slug: 'abc' } }
        expect(serialize(folder, [old]).startsWith('3:')).toBe(true)
    })
    it('overrides host and bookmark URLs and restores host URLs when disabled', () => {
        document.body.innerHTML =
            '<div id="trade"><select name="league"><option selected>New League</option></select><a href="https://www.pathofexile.com/trade/search/xbox/Standard/abc/live">Trade</a><a href="https://example.com">Other</a></div>'
        useSettingsStore.setState({ disabled: [] })
        const stop = startSelectedLeagueLinks()
        try {
            expect(bookmarkUrl(trade)).toContain('xbox/New%20League/abc/live')
            expect(document.querySelector('a')!.href).toContain('xbox/New%20League/abc/live')
        } finally {
            stop()
        }
        expect(document.querySelector('a')!.href).toContain('xbox/Standard/abc/live')
    })
})
