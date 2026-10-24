import type { ItemPrice } from '../../models/priceTrend'
import { searchLinkedVariant } from '../../integrations/poe-trade/linkFilters'
import { searchGemVariant } from '../../integrations/poe-trade/gemFilters'
import { searchMagebloodVariant } from '../../integrations/poe-trade/uniqueItems/magebloodFilters'
import { magebloodVariant } from './uniqueItems/magebloodVariant'
import { gemVariantValues } from './variantLabel'

// Resolve eligibility, tooltip and execution together so they cannot disagree.
export function variantSearch(price: ItemPrice, prices: ItemPrice[], version: '1' | '2') {
    const mageblood = magebloodVariant(price, version)
    if (mageblood)
        return {
            label: 'Search with this flask count',
            run: () => searchMagebloodVariant(mageblood.count, mageblood.foulborn, prices),
        }
    const gem = gemVariantValues(price)
    if (gem)
        return {
            label: 'Search with these gem level, quality and corruption filters',
            run: () => searchGemVariant(gem, version),
        }
    const links = price.links
    if (version === '1' && links)
        return {
            label: `Search for ${links} linked sockets`,
            run: () => searchLinkedVariant(links),
        }
}
