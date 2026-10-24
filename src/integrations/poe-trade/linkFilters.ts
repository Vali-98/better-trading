import { applyFilterValue, submitSearch } from './search'

export async function searchLinkedVariant(links: number) {
    if (!Number.isInteger(links) || links < 1 || links > 6) return ['Unsupported link count.']
    const warnings: string[] = []
    const applied = applyFilterValue(
        ['linkgroups'],
        'Link Groups',
        `${links}-${links}`,
        (message) => warnings.push(message)
    )
    if (!applied) return warnings.length ? warnings : ['The Link Groups filter is unavailable.']
    return submitSearch()
}
