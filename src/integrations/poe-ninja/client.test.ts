import { afterEach, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } } },
}))
import { browser } from 'wxt/browser'
import { fetchItemPrices } from './client'
afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})
it('deduplicates requests and caches an overview for one hour', async () => {
    const fetch = vi.fn(async (_url: string, _options: unknown) => ({
        ok: true,
        status: 200,
        json: async () => ({
            lines: [
                {
                    name: 'Original Sin',
                    baseType: 'Amethyst Ring',
                    detailsId: 'original-sin-amethyst-ring',
                    sparkLine: { data: [0, 1] },
                },
            ],
        }),
    }))
    vi.stubGlobal('fetch', fetch)
    const [first, second] = await Promise.all([
        fetchItemPrices('1', 'Test League'),
        fetchItemPrices('1', 'Test League'),
    ])
    expect(first).toBe(second)
    expect(fetch).toHaveBeenCalledTimes(20)
    expect(fetch.mock.calls[0][0]).toContain('league=Test%20League&type=UniqueAccessory')
    expect(browser.storage.local.set).toHaveBeenCalledTimes(1)
})
it('serves persisted data without network requests', async () => {
    vi.mocked(browser.storage.local.get).mockImplementationOnce((async () => ({
        'poe-ninja-item-trends-v6--1--Cached': {
            value: [],
            expiresAt: new Date(Date.now() + 10000).toISOString(),
        },
    })) as typeof browser.storage.local.get)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await fetchItemPrices('1', 'Cached')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
})
it('stops requesting categories when rate limited', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 429 }))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchItemPrices('1', 'Limited')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(browser.storage.local.set).not.toHaveBeenCalled()
})
