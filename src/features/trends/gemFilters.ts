import { applyFiltersAndSearch } from '../../integrations/poe-trade/search'
import type { FilterChanges } from '../../integrations/poe-trade/search'
export function gemFilterChanges(values: {
    level?: number
    quality?: number
    corrupted: boolean
}): FilterChanges {
    return {
        gemLevel: values.level === undefined ? null : { min: values.level, max: values.level },
        quality: values.quality === undefined ? null : { min: values.quality, max: values.quality },
        corrupted: values.corrupted ? 'yes' : 'no',
    }
}
export function searchGemVariant(
    values: Parameters<typeof gemFilterChanges>[0],
    version: '1' | '2'
) {
    return applyFiltersAndSearch(gemFilterChanges(values), { version })
}
