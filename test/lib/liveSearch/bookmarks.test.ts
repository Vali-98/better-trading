import { expect, it, vi } from 'vitest'
import { createBookmarkLiveManager } from '../../../src/lib/liveSearch/bookmarks'
const base = 'https://www.pathofexile.com/trade'
const search = (name: string) => ({ url: `${base}/search/League/${name}`, label: name })
function setup(active = true) {
    const transport = {
        targets: vi
            .fn()
            .mockResolvedValue(active ? [{ id: 1, label: 'Host', scope: `${base}/League` }] : []),
        open: vi.fn().mockResolvedValue(2),
        ready: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue({ ok: true }),
        focus: vi.fn().mockResolvedValue(undefined),
        delay: vi.fn().mockResolvedValue(undefined),
    }
    return { transport, add: createBookmarkLiveManager(transport) }
}
it('adds distinct bookmarks to an existing tab without opening or handing off the source', async () => {
    const { transport, add } = setup()
    expect(
        await add([search('one'), search('two'), search('one')], { create: true })
    ).toMatchObject({ ok: true, added: 2, total: 2 })
    expect(transport.open).not.toHaveBeenCalled()
    expect(transport.add.mock.calls).toEqual([
        [1, search('one')],
        [1, search('two')],
    ])
    expect(transport.focus).toHaveBeenCalledWith(1)
})
it('opens the first search, waits for authentication, then adds the remainder', async () => {
    const { transport, add } = setup(false)
    const calls: string[] = []
    transport.ready.mockImplementation(async () => {
        calls.push('ready')
    })
    transport.add.mockImplementation(async () => {
        calls.push('add')
        return { ok: true }
    })
    expect(
        await add([search('one'), search('two'), search('three')], { create: true })
    ).toMatchObject({ ok: true, added: 3 })
    expect(transport.open).toHaveBeenCalledWith(search('one').url + '/live')
    expect(calls).toEqual(['ready', 'add', 'add'])
    expect(transport.add.mock.calls).toEqual([
        [2, search('two')],
        [2, search('three')],
    ])
})
it('keeps individual bookmark actions from creating tabs and rejects mixed scopes before opening', async () => {
    const { transport, add } = setup(false)
    await expect(add([search('one')], { create: false })).rejects.toThrow('Open live search')
    await expect(
        add([search('one'), { url: `${base}/search/Other/two`, label: 'two' }], { create: true })
    ).rejects.toThrow('same game')
    expect(transport.open).not.toHaveBeenCalled()
})
it('reports partial completion and stops after a failure', async () => {
    const { transport, add } = setup()
    transport.add
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false, message: 'Rate limited' })
    const result = await add([search('one'), search('two'), search('three')], { create: true })
    expect(result).toMatchObject({ ok: false, added: 1, total: 3 })
    expect(result.message).toContain('Rate limited')
    expect(transport.add).toHaveBeenCalledTimes(2)
})
it('does not subscribe remaining items if the new native search cannot authenticate', async () => {
    const { transport, add } = setup(false)
    transport.ready.mockRejectedValueOnce(new Error('Not authenticated'))
    await expect(add([search('one'), search('two')], { create: true })).rejects.toThrow(
        'Not authenticated'
    )
    expect(transport.add).not.toHaveBeenCalled()
})
it('rejects a stale selected destination rather than silently opening another tab', async () => {
    const { transport, add } = setup()
    await expect(add([search('one')], { create: true, target: 99 })).rejects.toThrow(
        'no longer available'
    )
    expect(transport.open).not.toHaveBeenCalled()
})
