import { decodeSearchQuery } from '../encodedQuery'
import { tradeStatCatalog } from '../tradeStats'
import { selectedForbiddenPassives } from './forbiddenPassiveSelection'

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
