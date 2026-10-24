import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } } },
}))
import { browser } from 'wxt/browser'
import { removeFolder } from '../../../src/lib/bookmarks/storage'
const stored: Record<string, unknown> = {}
beforeEach(() => {
    vi.resetAllMocks()
    stored['bookmark-folders'] = {
        value: [
            { id: 'one', version: '1', archivedAt: null },
            { id: 'two', version: '1', archivedAt: null },
        ],
        expiresAt: null,
    }
    stored['bookmark-trades--one'] = { value: [{ id: 'trade' }] }
    vi.mocked(browser.storage.local.get).mockImplementation((async (key: string) => ({
        [key]: stored[key],
    })) as typeof browser.storage.local.get)
    vi.mocked(browser.storage.local.set).mockImplementation(async (value) => {
        Object.assign(stored, value)
    })
    vi.mocked(browser.storage.local.remove).mockImplementation(async () => {
        delete stored['bookmark-trades--one']
    })
})
it('keeps trades intact when removing the folder fails', async () => {
    vi.mocked(browser.storage.local.set).mockRejectedValueOnce(new Error('Write failed'))
    await expect(removeFolder('one')).rejects.toThrow('Write failed')
    expect(browser.storage.local.remove).not.toHaveBeenCalled()
    expect(stored['bookmark-trades--one']).toBeDefined()
})
it('removes the visible folder even if orphaned data cleanup fails', async () => {
    vi.mocked(browser.storage.local.remove).mockRejectedValueOnce(new Error('Cleanup failed'))
    await removeFolder('one')
    expect(stored['bookmark-folders']).toMatchObject({ value: [{ id: 'two' }] })
    expect(stored['bookmark-trades--one']).toBeDefined()
})
it('removes the folder and its contents on success', async () => {
    await removeFolder('one')
    expect(stored['bookmark-folders']).toMatchObject({ value: [{ id: 'two' }] })
    expect(stored['bookmark-trades--one']).toBeUndefined()
})
