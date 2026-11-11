import type { GameVersion } from '../../models/search'
export interface TradeDestination {
    version: GameVersion
    type: string
    league: string
    slug: string
}
const segment = (value: string) => {
    try {
        return encodeURIComponent(decodeURIComponent(value))
    } catch {
        return encodeURIComponent(value)
    }
}
export function buildTradeUrl(
    destination: TradeDestination,
    options: { live?: boolean; origin?: string } = {}
) {
    if (
        !['1', '2'].includes(destination.version) ||
        !['search', 'exchange'].includes(destination.type) ||
        !destination.league ||
        !/^[A-Za-z0-9_-]+$/.test(destination.slug)
    )
        throw new Error('Invalid trade destination.')
    const league = destination.league.split('/')
    if (
        league.some((part) => !part) ||
        league.length > 2 ||
        (league.length === 2 && !['poe2', 'xbox', 'sony'].includes(league[0]))
    )
        throw new Error('Invalid trade realm or league.')
    if (options.live && destination.type !== 'search')
        throw new Error('Only item searches support Live Search.')
    const origin = options.origin ?? 'https://www.pathofexile.com'
    const source = new URL(origin)
    if (
        source.protocol !== 'https:' ||
        !['www.pathofexile.com', 'pathofexile.com'].includes(source.hostname) ||
        source.port ||
        source.username ||
        source.password ||
        source.origin !== origin
    )
        throw new Error('Invalid trade origin.')
    return `${origin}/trade${destination.version === '2' ? '2' : ''}/${destination.type}/${league.map(segment).join('/')}/${destination.slug}${options.live ? '/live' : ''}`
}

export function buildLiveSocketUrl(destination: TradeDestination, origin: string) {
    const url = new URL(buildTradeUrl(destination, { origin, live: true }))
    url.protocol = 'wss:'
    url.pathname = url.pathname
        .replace(/^\/(trade2?)\/search\//, '/api/$1/live/')
        .replace(/\/live$/, '')
    return url.href
}
