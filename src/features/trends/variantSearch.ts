import type { ItemPrice } from '../../models/priceTrend'
import { applyFiltersAndSearch } from '../../integrations/poe-trade/search'
import { supportsFilter } from '../../integrations/poe-trade/filterDefinitions'
import { searchGemVariant } from './gemFilters'
import { searchMagebloodVariant } from './uniqueItems/searchMageblood'
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
    if (links && supportsFilter('links', version))
        return {
            label: `Search for ${links} linked sockets`,
            run: () => applyFiltersAndSearch({ links: { min: links, max: links } }, { version }),
        }
}
