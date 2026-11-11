import { buildTradeUrl, type TradeDestination } from './urls'
import { currentLocation } from './location'
import { decodeSearchQuery, encodeSearchQuery } from './encodedQuery'

export { buildTradeUrl as tradeUrl }
export function bookmarkUrl(
    trade: { location: Pick<TradeDestination, 'version' | 'type' | 'slug'> },
    options: { live?: boolean; league?: string } = {}
) {
    const league = options.league ?? currentLocation().league
    if (!league) return undefined
    return buildTradeUrl({ ...trade.location, league }, options)
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
