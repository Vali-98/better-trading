import { afterEach, expect, it, vi } from 'vitest'
import { createLiveCoordinator } from './coordinator'
const url = (league: string, query: string) =>
    `https://www.pathofexile.com/trade/search/${league}/${query}`
afterEach(() => vi.useRealTimers())
it('discovers only compatible other tabs and removes stale or closed registrations', () => {
    vi.useFakeTimers()
    const manager = createLiveCoordinator({ send: vi.fn(), focus: vi.fn() })
    manager.update(1, { url: url('League', 'one') })
    manager.update(2, { url: url('League', 'two'), label: 'Second' })
    manager.update(3, { url: url('Other', 'three') })
    expect(manager.candidates(1, url('League', 'one'))).toEqual([{ id: 2, label: 'Second' }])
    manager.remove(2)
    expect(manager.candidates(1, url('League', 'one'))).toEqual([])
    vi.advanceTimersByTime(21_000)
    expect(manager.candidates(4, url('Other', 'four'))).toEqual([])
})
it('waits for destination authentication before stopping the source and focusing the target', async () => {
    const calls: string[] = []
    let accept: (value: unknown) => void = () => {}
    const manager = createLiveCoordinator({
        send: vi.fn((id, value) => {
            const message = value as { type: string }
            calls.push(`${id}:${message.type}`)
            return id === 2
                ? new Promise((resolve) => {
                      accept = resolve
                  })
                : Promise.resolve({ ok: true })
        }),
        focus: async (id) => {
            calls.push(`focus:${id}`)
        },
    })
    manager.update(2, { url: url('League', 'two') })
    const merging = manager.merge(1, 2, url('League', 'one'), 'First')
    expect(calls).toEqual(['2:bt-live-add'])
    accept({ ok: true })
    await merging
    expect(calls).toEqual(['2:bt-live-add', '1:bt-live-handoff', 'focus:2'])
})
it('keeps the source running when the destination fails or is incompatible', async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, message: 'Authentication failed' })
    const focus = vi.fn()
    const manager = createLiveCoordinator({ send, focus })
    manager.update(2, { url: url('League', 'two') })
    await expect(manager.merge(1, 2, url('League', 'one'), 'First')).rejects.toThrow(
        'Authentication failed'
    )
    expect(send).toHaveBeenCalledTimes(1)
    expect(focus).not.toHaveBeenCalled()
    await expect(manager.merge(1, 2, url('Other', 'one'), 'First')).rejects.toThrow(
        'no longer available'
    )
    expect(send).toHaveBeenCalledTimes(1)
})
