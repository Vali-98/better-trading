import { searchItemName } from '../../../integrations/poe-trade/searchQuery'
import { tradeStatCatalog } from '../../../integrations/poe-trade/tradeStats'
import {
    resolveNinjaFlaskStat,
    withMagebloodFilter,
} from '../../../integrations/poe-trade/uniqueItems/magebloodFilters'
import { updateSearchQuery } from '../../../integrations/poe-trade/navigation'
import type { ItemPrice } from '../../../models/priceTrend'

export async function searchMagebloodVariant(
    count: number,
    foulborn: boolean,
    prices: ItemPrice[]
) {
    try {
        await updateSearchQuery(async (query, context) => {
            if (context.version !== '1')
                throw new Error('Open a PoE1 Mageblood search before applying a flask variant.')
            const name = await searchItemName(context.slug, '', '1')
            if (name !== (foulborn ? 'Foulborn Mageblood' : 'Mageblood'))
                throw new Error('The current search is no longer the selected Mageblood item.')
            const catalog = await tradeStatCatalog('1')
            const selected = resolveNinjaFlaskStat(prices, name, catalog)
            const other = resolveNinjaFlaskStat(
                prices,
                foulborn ? 'Mageblood' : 'Foulborn Mageblood',
                catalog
            )
            if (!selected)
                throw new Error(
                    'poe.ninja does not provide enough stat metadata to identify this flask filter.'
                )
            return withMagebloodFilter(query, count, selected, other)
        })
        return []
    } catch (error) {
        return [error instanceof Error ? error.message : 'Unable to apply the flask filter.']
    }
}
