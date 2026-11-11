import type { Trade } from '../../lib/bookmarks/storage'
import { currentLocation } from './location'
import { buildTradeUrl } from './urls'

export function parseBookmarkLink(value: string): Trade['location'] {
    const url = new URL(value.trim())
    if (url.username || url.password || url.port) throw new Error('Invalid trade origin.')
    if (
        url.search ||
        url.hash ||
        !/^\/trade2?\/(search|exchange)\/(?:[^/]+\/){1,2}[A-Za-z0-9_-]+(?:\/live)?$/.test(
            url.pathname
        )
    )
        throw new Error('Enter a complete Path of Exile trade search URL.')
    const parsed = currentLocation(url.pathname)
    const league = parsed.league.split('/').map(decodeURIComponent).join('/')
    const live = url.pathname.endsWith('/live')
    const canonical = new URL(buildTradeUrl({ ...parsed, league }, { live, origin: url.origin }))
    if (
        JSON.stringify(canonical.pathname.split('/').map(decodeURIComponent)) !==
        JSON.stringify(url.pathname.split('/').map(decodeURIComponent))
    )
        throw new Error('Invalid trade realm or path.')
    return { version: parsed.version, type: parsed.type, slug: parsed.slug, league, live }
}
export function savedBookmarkLink(trade: Trade) {
    try {
        const league = trade.location.league ?? currentLocation().league
        return league
            ? buildTradeUrl({ ...trade.location, league }, { live: trade.location.live })
            : ''
    } catch {
        return ''
    }
}
export function overrideTradeLeague(trade: Trade, value: string): Trade {
    const name = value.trim()
    if (!name || /[?#\\\u0000-\u001f]/.test(name)) throw new Error('Enter a valid league name.')
    const old = trade.location.league ?? currentLocation().league ?? ''
    const realm = old.includes('/') ? old.split('/')[0] : undefined
    const league = name.includes('/') || !realm ? name : `${realm}/${name}`
    buildTradeUrl({ ...trade.location, league })
    return { ...trade, location: { ...trade.location, league } }
}
