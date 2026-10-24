import { expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } } },
}))
import { browser } from 'wxt/browser'
import { resolveTradeStat } from '../../../src/integrations/poe-trade/tradeStats'
it('resolves stat IDs by exact explicit text and shares the live catalog request', async () => {
    const fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({
            result: [
                {
                    entries: [
                        { id: 'explicit.left', type: 'explicit', text: 'Leftmost # Flask' },
                        { id: 'explicit.right', type: 'explicit', text: 'Rightmost # Flask' },
                    ],
                },
            ],
        }),
    }))
    vi.stubGlobal('fetch', fetch)
    try {
        expect(await resolveTradeStat('Leftmost # Flask', '1')).toBe('explicit.left')
        expect(await resolveTradeStat('Rightmost # Flask', '1')).toBe('explicit.right')
        expect(await resolveTradeStat('Unknown', '1')).toBeUndefined()
        expect(fetch).toHaveBeenCalledTimes(1)
        expect(browser.storage.local.set).toHaveBeenCalledTimes(1)
    } finally {
        vi.unstubAllGlobals()
    }
})

it('uses the persisted catalog across module restarts', async () => {
    vi.resetModules()
    vi.mocked(browser.storage.local.get).mockImplementationOnce((async () => ({
        'bt-trade-stat-catalog-v1--2': {
            value: [{ id: 'explicit.saved', text: 'Saved stat', type: 'explicit' }],
            expiresAt: Date.now() + 100000,
        },
    })) as typeof browser.storage.local.get)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    try {
        const { resolveTradeStat: resolve } =
            await import('../../../src/integrations/poe-trade/tradeStats')
        expect(await resolve('Saved stat', '2')).toBe('explicit.saved')
        expect(fetch).not.toHaveBeenCalled()
    } finally {
        vi.unstubAllGlobals()
    }
})
