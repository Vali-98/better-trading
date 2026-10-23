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

export function highlightMatchingStats(
    row: HTMLElement,
    needles: RegExp[],
    addCleanup: (cleanup: () => void) => void
) {
    row.querySelectorAll<HTMLElement>('.explicitMod,.pseudoMod,.implicitMod').forEach((mod) => {
        if (!needles.some((needle) => needle.test(mod.textContent ?? ''))) return
        mod.classList.add('bt-highlight-stat-filters')
        addCleanup(() => mod.classList.remove('bt-highlight-stat-filters'))
    })
}
