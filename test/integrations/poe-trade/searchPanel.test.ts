// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { searchedStats } from '../../../src/integrations/poe-trade/searchPanel'

afterEach(() => {
    document.body.innerHTML = ''
})

it('includes pseudo stat filters in result highlighting', () => {
    document.body.innerHTML =
        '<div class="search-advanced-pane"><div class="filter-group-body"><div class="filter"><div class="filter-title"><i class="mutate-type">pseudo</i><span>+# to Strength</span></div></div><div class="filter"><div class="filter-title"><i class="mutate-type">explicit</i><span>+# to maximum Life</span></div></div></div></div>'
    expect(searchedStats()).toEqual(['+# to strength', '+# to maximum life'])
})

it('ignores ordinary field headings when collecting selected stat filters', () => {
    document.body.innerHTML =
        '<div class="search-advanced-pane"><div class="filter-group-body"><div class="filter"><div class="filter-title">Damage</div></div><div class="filter"><div class="filter-title">Strength</div></div><div class="filter"><div class="filter-title"><i class="mutate-type mutate-type-explicit">explicit</i> <span>+#% to Cold Resistance</span></div></div></div></div>'
    expect(searchedStats()).toEqual(['+#% to cold resistance'])
})
