// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { subscribePageUpdates } from '../../../src/lib/page/updates'
const stops: (() => void)[] = []
afterEach(() => {
    stops.splice(0).forEach((stop) => stop())
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
})
it('shares observation and fallback polling, isolates subscribers, and releases resources', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const broken = vi.fn(() => {
        throw new Error('Broken enhancer')
    })
    const healthy = vi.fn()
    stops.push(subscribePageUpdates(broken), subscribePageUpdates(healthy))
    expect(observe).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)
    window.history.pushState({}, '', '/trade/search/Standard/changed')
    await vi.advanceTimersByTimeAsync(510)
    expect(healthy.mock.lastCall?.[0].context.pathname).toBe('/trade/search/Standard/changed')
    stops.shift()!()
    expect(disconnect).not.toHaveBeenCalled()
    stops.shift()!()
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
})
it('detects stat input changes but ignores extension highlight class changes', async () => {
    vi.useFakeTimers()
    document.body.innerHTML =
        '<div class="search-advanced-pane"><div class="filter-group-body"><div class="filter"><div class="filter-title"><i class="mutate-type">explicit</i>Life</div><input value="1"></div></div></div><div class="item-mod"></div>'
    const listener = vi.fn()
    stops.push(subscribePageUpdates(listener))
    document.querySelector('input')!.value = '2'
    document.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(10)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.lastCall?.[0].contextChanged).toBe(true)
    document.querySelector('.item-mod')!.classList.add('bt-highlight-stat-filters')
    await vi.advanceTimersByTimeAsync(10)
    expect(listener).toHaveBeenCalledTimes(2)
})
