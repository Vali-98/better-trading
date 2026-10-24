// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../../../src/integrations/poe-trade/searchQuery', () => ({
    searchItemName: vi.fn(async () => 'Forbidden Flame'),
}))
vi.mock('../../../src/integrations/poe-trade/uniqueItems/forbiddenJewels', () => ({
    searchForbiddenPassives: vi.fn(),
}))
import { searchForbiddenPassives } from '../../../src/integrations/poe-trade/uniqueItems/forbiddenJewels'
import { watchTrendSearch } from '../../../src/features/trends/watchTrendSearch'
let stop: (() => void) | undefined
afterEach(() => {
    stop?.()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
})
it('retries unavailable passives on a new stat filter, without automatic retries', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/trade/search/Standard/query')
    document.body.innerHTML =
        '<div class="search-advanced-pane"><div class="filter-group-body"></div></div>'
    vi.mocked(searchForbiddenPassives)
        .mockResolvedValueOnce([])
        .mockResolvedValue(['Unleashed Potential'])
    const resolved = vi.fn()
    stop = watchTrendSearch(resolved)
    await vi.advanceTimersByTimeAsync(10)
    expect(searchForbiddenPassives).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(searchForbiddenPassives).toHaveBeenCalledTimes(1)
    document.querySelector('.filter-group-body')!.innerHTML =
        '<div class="filter"><div class="filter-title"><i class="mutate-type">explicit</i>Allocates Unleashed Potential</div><input value="1"></div>'
    await vi.advanceTimersByTimeAsync(10)
    expect(searchForbiddenPassives).toHaveBeenCalledTimes(2)
    expect(resolved.mock.lastCall?.[0]).toMatchObject({
        name: 'Forbidden Flame',
        passives: ['Unleashed Potential'],
    })
})
