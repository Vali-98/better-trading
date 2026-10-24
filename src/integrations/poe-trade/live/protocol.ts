import { buildTradeUrl, buildLiveSocketUrl } from '../urls'
import type { LiveSearch } from '../../../models/liveSearch'

export function parseLiveSearch(value: string, label = ''): LiveSearch {
    const url = new URL(value)
    if (
        !['www.pathofexile.com', 'pathofexile.com'].includes(url.hostname) ||
        url.protocol !== 'https:' ||
        url.port ||
        url.username ||
        url.password
    )
        throw new Error('Invalid trade website.')
    const match = url.pathname.match(
        /^\/(trade2?)\/search\/((?:(?:poe2|xbox|sony)\/)?[^/]+)\/([A-Za-z0-9_-]+)(?:\/live)?\/?$/
    )
    if (!match) throw new Error('Invalid trade search URL.')
    const [, game, league, query] = match
    const destination = {
        version: game === 'trade2' ? ('2' as const) : ('1' as const),
        type: 'search',
        league,
        slug: query,
    }
    return {
        url: buildTradeUrl(destination, { origin: url.origin }),
        socket: buildLiveSocketUrl(destination, url.origin),
        scope: `${url.origin}/${game}/${league}`,
        key: query,
        label: label.trim().slice(0, 100) || 'Live search',
    }
}
export function searchFromSocket(value: string, label: string) {
    const url = new URL(value)
    if (url.protocol !== 'wss:') throw new Error('Invalid live socket.')
    return parseLiveSearch(
        `https://${url.host}${url.pathname.replace(/^\/api\/(trade2?)\/live\//, '/$1/search/')}`,
        label
    )
}
export function decodeLiveMessage(value: unknown) {
    if (typeof value !== 'string' || value.length > 100_000) return undefined
    try {
        const data = JSON.parse(value)
        return {
            auth: data?.auth === true,
            error: Boolean(data?.error),
            token:
                typeof data?.result === 'string' && /^[A-Za-z0-9_.~-]+$/.test(data.result)
                    ? data.result
                    : undefined,
        }
    } catch {
        return undefined
    }
}
