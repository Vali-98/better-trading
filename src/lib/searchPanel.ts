export function recommendTitle() {
    const read = (selector: string) =>
        document.querySelector<HTMLInputElement>(selector)?.value || ''
    const name = read('.search-panel .search-bar .search-left input')
    const category = read(
        '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(1) input'
    )
    const rarity = read(
        '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(2) input'
    )
    return (
        name ||
        (category === 'Any' ? '' : category) +
            (category && rarity && rarity !== 'Any' ? ` (${rarity})` : '')
    )
}
export function searchedStats() {
    return [
        ...new Set(
            Array.from(
                document.querySelectorAll(
                    '.search-advanced-pane .filter-group-body .filter:not(.disabled) .filter-title'
                ),
                (node) => {
                    const type = node
                        .querySelector('.mutate-type')
                        ?.textContent?.trim()
                        .toLowerCase()
                    if (!type) return ''
                    const value = (
                        node.querySelector(':scope > span')?.textContent ??
                        node.textContent ??
                        ''
                    )
                        .trim()
                        .toLowerCase()
                    return value
                        .replace(/^\((?:pseudo|psuedo|enchant)\)\s*/, '')
                        .replace(/^(?:pseudo|psuedo|enchant)\s+/, '')
                }
            ).filter(Boolean)
        ),
    ]
}
