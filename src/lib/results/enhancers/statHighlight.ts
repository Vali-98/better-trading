import { searchedStats } from '../../searchPanel'

export function statNeedles() {
    return searchedStats().map(
        (stat) =>
            new RegExp(
                stat.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&').replace(/#/g, '[+\\-]?\\d+'),
                'i'
            )
    )
}

export function highlightMatchingStats(row: HTMLElement, needles: RegExp[]) {
    row.querySelectorAll<HTMLElement>(
        '.explicitMod,.pseudoMod,.implicitMod,.item-mod--explicit,.item-mod--pseudo,.item-mod--implicit'
    ).forEach((mod) => {
        const statText =
            mod.querySelector<HTMLElement>('[data-field^="stat."]')?.textContent ?? mod.textContent
        if (!needles.some((needle) => needle.test(statText ?? ''))) return
        mod.classList.add('bt-highlight-stat-filters')
    })
}

export function clearHighlightedStats(row: HTMLElement) {
    row.querySelectorAll('.bt-highlight-stat-filters').forEach((mod) => {
        mod.classList.remove('bt-highlight-stat-filters')
    })
}
