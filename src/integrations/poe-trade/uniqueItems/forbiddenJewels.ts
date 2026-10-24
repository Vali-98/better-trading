import { decodeSearchQuery } from '../encodedQuery'
import { tradeStatCatalog, type TradeStat } from '../tradeStats'

export function isForbiddenJewel(name: string) {
    return /^Forbidden (Flame|Flesh)$/i.test(name)
}

// Ignore exclusions and optional groups: they do not select an allocated passive.
export function selectedForbiddenPassives(
    query: Record<string, unknown>,
    name: string,
    catalog: TradeStat[]
) {
    if (!isForbiddenJewel(name) || !Array.isArray(query.stats)) return []
    const counterpart = /flame$/i.test(name) ? 'Flesh' : 'Flame'
    const selected = new Set<string>()
    for (const group of query.stats) {
        if (
            !group ||
            group.disabled ||
            !['and', 'or', 'count'].includes(group.type) ||
            !Array.isArray(group.filters)
        )
            continue
        if (group.type === 'count' && Number(group.value?.min ?? 0) < 1) continue
        for (const filter of group.filters) {
            if (!filter || filter.disabled || typeof filter.id !== 'string') continue
            const option = filter.value?.option
            const id =
                option !== undefined && !filter.id.includes('|')
                    ? `${filter.id}|${option}`
                    : filter.id
            const entry = catalog.find((stat) => stat.id === id && stat.type === 'explicit')
            const match = entry?.text.match(
                /^Allocates (.+) if you have the matching modifier on Forbidden (Flame|Flesh)$/i
            )
            if (match && match[2].toLowerCase() === counterpart.toLowerCase())
                selected.add(match[1])
        }
    }
    return [...selected]
}

export async function searchForbiddenPassives(slug: string, name: string, version: '1' | '2') {
    try {
        const query = await decodeSearchQuery(slug)
        // Avoid fetching the catalog for an unfiltered jewel search.
        if (
            !Array.isArray(query.stats) ||
            !query.stats.some(
                (group) =>
                    group &&
                    !group.disabled &&
                    Array.isArray(group.filters) &&
                    group.filters.some(
                        (filter: { id?: string; disabled?: boolean }) =>
                            !filter.disabled && filter.id
                    )
            )
        )
            return []
        return selectedForbiddenPassives(query, name, await tradeStatCatalog(version))
    } catch {
        return []
    }
}
