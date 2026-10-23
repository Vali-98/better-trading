// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { highlightMatchingStats } from './statHighlight'

it('matches only an item modifier stat field, not its affix name or tier', () => {
    const row = document.createElement('div')
    row.innerHTML =
        '<div class="item-mod item-mod--explicit"><span data-field="stat.explicit.stat_1">+32 to Strength</span><span>of the Gorilla (≥44)</span></div><div class="item-mod item-mod--explicit"><span data-field="stat.explicit.stat_2">+90 to maximum Life</span><span>of the Strength (≥44)</span></div>'
    highlightMatchingStats(row, [/\+\d+ to strength/i])
    const mods = row.querySelectorAll('.item-mod')
    expect(mods[0].classList.contains('bt-highlight-stat-filters')).toBe(true)
    expect(mods[1].classList.contains('bt-highlight-stat-filters')).toBe(false)
})
