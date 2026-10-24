import { resultMods } from '../../../integrations/poe-trade/results'
import { searchedStats } from '../../../integrations/poe-trade/searchPanel'

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
    for (const { node, text } of resultMods(row)) {
        if (needles.some((needle) => needle.test(text)))
            node.classList.add('bt-highlight-stat-filters')
    }
}

export function clearHighlightedStats(row: HTMLElement) {
    row.querySelectorAll('.bt-highlight-stat-filters').forEach((mod) => {
        mod.classList.remove('bt-highlight-stat-filters')
    })
}
