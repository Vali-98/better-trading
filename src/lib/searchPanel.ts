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
    return Array.from(
        document.querySelectorAll(
            '.search-advanced-pane:last-child .filter-group-body .filter:not(.disabled) .filter-title'
        ),
        (node) =>
            (node.textContent ?? '')
                .trim()
                .toLowerCase()
                .replace(/^pseudo /, '')
    )
}
