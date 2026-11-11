import { buildTradeUrl, type TradeDestination } from './urls'
import { currentLocation } from './location'
import { decodeSearchQuery, encodeSearchQuery } from './encodedQuery'
import { selectedLeagueOverride } from './selectedLeagueState'
import { reportIntegrationIssue } from '../diagnostics'

export function tradeUrl(
    destination: TradeDestination,
    options: { live?: boolean; origin?: string } = {}
) {
    return buildTradeUrl(
        {
            ...destination,
            league: selectedLeagueOverride(destination.version) ?? destination.league,
        },
        options
    )
}
export function bookmarkUrl(
    trade: {
        location: Pick<TradeDestination, 'version' | 'type' | 'slug'> & {
            league?: string
            live?: boolean
        }
    },
    options: { live?: boolean; league?: string } = {}
) {
    try {
        const league = options.league ?? trade.location.league ?? currentLocation().league
        if (!league) return undefined
        return safeTradeUrl(
            { ...trade.location, league },
            { ...options, live: options.live ?? trade.location.live }
        )
    } catch {
        reportIntegrationIssue('poe-trade', 'A bookmark link could not be generated')
        return undefined
    }
}
// Rendering must never promote a malformed link into a failure of the panel.
// Keep buildTradeUrl strict for editor validation and actual navigation actions.
export function safeTradeUrl(
    destination: TradeDestination,
    options: { live?: boolean; origin?: string } = {}
) {
    try {
        return tradeUrl(destination, options)
    } catch {
        try {
            return buildTradeUrl(destination, options)
        } catch {
            reportIntegrationIssue('poe-trade', 'A trade link could not be generated')
            return undefined
        }
    }
}
export function liveSearchUrl(value: string) {
    const url = new URL(value)
    return buildTradeUrl(currentLocation(url.pathname), { origin: url.origin, live: true })
}
export async function replaceSearchQuery(query: Record<string, unknown>, expected = location.href) {
    const slug = await encodeSearchQuery(query)
    if (location.href !== expected)
        throw new Error('The search changed before the filters could be applied.')
    const source = new URL(expected)
    const context = currentLocation(source.pathname)
    if (context.type !== 'search') throw new Error('Open an item search before applying filters.')
    const destination = new URL(buildTradeUrl({ ...context, slug }, { origin: source.origin }))
    destination.search = source.search
    destination.hash = source.hash
    location.assign(destination.href)
}
export async function updateSearchQuery(
    transform: (
        query: Record<string, unknown>,
        context: ReturnType<typeof currentLocation>
    ) => Record<string, unknown> | Promise<Record<string, unknown>>
) {
    const expected = location.href
    const context = currentLocation()
    if (context.type !== 'search' || !context.slug?.startsWith('H4sI'))
        throw new Error('Open a current encoded search before applying stat filters.')
    const query = await decodeSearchQuery(context.slug)
    await replaceSearchQuery(await transform(query, context), expected)
}
