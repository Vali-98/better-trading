import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(), set: vi.fn() } } },
}))
import { browser } from 'wxt/browser'
import { fetchItemPrices } from '../../../src/lib/prices/itemPrices'
const stored: Record<string, unknown> = {}
const payload = (name = 'Original Sin') => ({
    lines: [
        {
            name,
            baseType: 'Amethyst Ring',
            detailsId: 'original-sin-amethyst-ring',
            sparkLine: { data: [0, 1] },
        },
    ],
})
beforeEach(() => {
    for (const key of Object.keys(stored)) delete stored[key]
    vi.mocked(browser.storage.local.get).mockImplementation((async (key: string) => ({
        [key]: stored[key],
    })) as typeof browser.storage.local.get)
    vi.mocked(browser.storage.local.set).mockImplementation(async (values) => {
        Object.assign(stored, values)
    })
})
afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})
it('shares in-flight requests and caches each category independently', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => payload() }))
    vi.stubGlobal('fetch', fetch)
    const [first, second] = await Promise.all([
        fetchItemPrices('1', 'Test'),
        fetchItemPrices('1', 'Test'),
    ])
    expect(first).toBe(second)
    expect(first.complete).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(20)
    expect(Object.keys(stored)).toHaveLength(20)
    await fetchItemPrices('1', 'Test')
    expect(fetch).toHaveBeenCalledTimes(20)
})
it('retries failed categories without refetching successful ones', async () => {
    const fetch = vi.fn(async (url: string) =>
        url.includes('type=SkillGem')
            ? { ok: false, status: 503, json: async () => ({}) }
            : { ok: true, status: 200, json: async () => payload() }
    )
    vi.stubGlobal('fetch', fetch)
    expect((await fetchItemPrices('1', 'Partial')).complete).toBe(false)
    expect(Object.keys(stored)).toHaveLength(19)
    fetch.mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: async () => payload('Bladefall'),
    }))
    const next = await fetchItemPrices('1', 'Partial')
    expect(fetch).toHaveBeenCalledTimes(21)
    expect(next.complete).toBe(true)
    expect(next.prices.some((price) => price.name === 'Bladefall')).toBe(true)
})
it('preserves stale categories on refresh failure and uses cached categories after a rate limit', async () => {
    const key = 'poe-ninja-item-categories-v1--1--Limited'
    const old = {
        name: 'Old',
        baseType: '',
        detailsId: 'old',
        category: 'unique-accessories',
        sparkLine: { data: [0, 1] },
    }
    stored[`${key}--UniqueAccessory`] = { value: [old], expires: 0 }
    stored[`${key}--SkillGem`] = {
        value: [{ ...old, name: 'Cached gem' }],
        expires: Date.now() + 10000,
    }
    const fetch = vi.fn(async () => ({ ok: false, status: 429 }))
    vi.stubGlobal('fetch', fetch)
    const result = await fetchItemPrices('1', 'Limited')
    expect(result).toEqual({ prices: [old, { ...old, name: 'Cached gem' }], complete: false })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(browser.storage.local.set).not.toHaveBeenCalled()
})
it('does not replace stale data with a malformed successful response', async () => {
    const key = 'poe-ninja-item-categories-v1--1--Malformed--UniqueAccessory'
    const old = {
        name: 'Old',
        baseType: '',
        detailsId: 'old',
        category: 'unique-accessories',
        sparkLine: { data: [0, 1] },
    }
    stored[key] = { value: [old], expires: 0 }
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ changed: [] }) }))
    )
    const result = await fetchItemPrices('1', 'Malformed')
    expect(result.complete).toBe(false)
    expect(result.prices).toEqual([old])
    expect(stored[key]).toEqual({ value: [old], expires: 0 })
})
it('returns prices when persisting the cache fails', async () => {
    vi.mocked(browser.storage.local.set).mockRejectedValue(new Error('Storage full'))
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, status: 200, json: async () => payload() }))
    )
    expect((await fetchItemPrices('1', 'Full')).prices).toHaveLength(20)
})
