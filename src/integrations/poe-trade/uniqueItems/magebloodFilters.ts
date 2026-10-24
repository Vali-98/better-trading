import { searchItemName } from '../searchQuery'
import { currentLocation } from '../location'
import { decodeSearchQuery, encodeSearchQuery } from '../encodedQuery'
import { tradeStatCatalog, canonicalStatText, type TradeStat } from '../tradeStats'
import type { ItemPrice } from '../../../models/priceTrend'

export function resolveNinjaFlaskStat(prices: ItemPrice[], name: string, catalog: TradeStat[]) {
    const peers = prices.filter((price) => price.name === name)
    const ids = new Set(peers.flatMap((price) => price.tradeStatIds ?? []))
    const texts = new Set(
        peers.flatMap((price) => price.explicitModifiers ?? []).map(canonicalStatText)
    )
    const matches = catalog.filter(
        (stat) =>
            stat.type === 'explicit' &&
            /(?:leftmost|rightmost).*#.*flask.*constantly/i.test(stat.text) &&
            (ids.has(stat.id) || texts.has(canonicalStatText(stat.text)))
    )
    return matches.length === 1 ? matches[0].id : undefined
}

export function withMagebloodFilter(
    query: Record<string, unknown>,
    count: number,
    selectedId: string,
    otherId?: string
) {
    if (!Number.isInteger(count) || count < 2 || count > 5) throw new Error('Invalid flask count')
    const updated = structuredClone(query)
    const stats = updated.stats
    if (stats !== undefined && !Array.isArray(stats)) throw new Error('Invalid stat groups')
    const groups = (stats ?? []) as {
        type: string
        filters: { id: string; [key: string]: unknown }[]
        [key: string]: unknown
    }[]
    for (const group of groups) {
        if (!Array.isArray(group.filters)) throw new Error('Invalid stat filters')
        const matching = group.filters.some(
            (filter) => filter.id === selectedId || filter.id === otherId
        )
        if (matching && group.type !== 'and')
            throw new Error(
                'An existing flask filter uses an advanced stat group; edit it before applying this variant.'
            )
        group.filters = group.filters.filter(
            (filter) => filter.id !== selectedId && filter.id !== otherId
        )
    }
    groups.push({ type: 'and', filters: [{ id: selectedId, value: { min: count, max: count } }] })
    updated.stats = groups
    return updated
}

export async function searchMagebloodVariant(
    count: number,
    foulborn: boolean,
    prices: ItemPrice[]
) {
    try {
        const originalPath = location.pathname
        const context = currentLocation()
        if (
            context.version !== '1' ||
            context.type !== 'search' ||
            !context.slug?.startsWith('H4sI')
        )
            return ['Open a current encoded Mageblood search before applying a flask variant.']
        const query = await decodeSearchQuery(context.slug)
        const name = await searchItemName(context.slug, '', '1')
        if (name !== (foulborn ? 'Foulborn Mageblood' : 'Mageblood'))
            return ['The current search is no longer the selected Mageblood item.']
        const catalog = await tradeStatCatalog('1')
        const selected = resolveNinjaFlaskStat(prices, name!, catalog)
        const otherName = foulborn ? 'Mageblood' : 'Foulborn Mageblood'
        const other = resolveNinjaFlaskStat(prices, otherName, catalog)
        if (!selected)
            return [
                'poe.ninja does not provide enough stat metadata to identify this flask filter.',
            ]
        const updated = withMagebloodFilter(query, count, selected, other)
        const slug = await encodeSearchQuery(updated)
        if (location.pathname !== originalPath)
            return ['The search changed before the flask filter could be applied.']
        // Navigation submits the updated search while preserving every other query field.
        const path = location.pathname.split('/')
        path[path.indexOf('search') + 2] = slug
        const target = new URL(location.href)
        target.pathname = path.join('/').replace(/\/live$/, '')
        location.assign(target.href)
        return []
    } catch (error) {
        return [error instanceof Error ? error.message : 'Unable to apply the flask filter.']
    }
}
