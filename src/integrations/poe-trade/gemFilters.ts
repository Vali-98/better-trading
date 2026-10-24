import { applyFilterValue, clearNumericFilter, submitSearch } from './search'

export function applyGemFilters(
    values: { level?: number; quality?: number; corrupted: boolean },
    version: '1' | '2'
) {
    const warnings: string[] = []
    const set = (titles: string[], label: string, value: number | undefined) => {
        if (value === undefined) {
            if (!clearNumericFilter(titles)) warnings.push(`${label} filter is unavailable.`)
        } else
            applyFilterValue(titles, label, `${value}-${value}`, (message) =>
                warnings.push(message)
            )
    }
    set(['gemlevel'], 'Gem Level', values.level)
    set(
        version === '2' ? ['itemquality', 'quality'] : ['quality', 'itemquality'],
        'Quality',
        values.quality
    )
    applyFilterValue(['corrupted'], 'Corrupted', values.corrupted ? 'yes' : 'no', (message) =>
        warnings.push(message)
    )
    return warnings
}

export async function searchGemVariant(
    values: Parameters<typeof applyGemFilters>[0],
    version: '1' | '2'
) {
    const warnings = applyGemFilters(values, version)
    if (warnings.length) return warnings
    return submitSearch()
}
