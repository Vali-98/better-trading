import { expect, it, vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import { searchItemName } from '../../../src/integrations/poe-trade/searchQuery'
import { searchTrendPrices } from '../../../src/features/trends/matchPrices'

it('reads the selected unique from the compressed search rather than stale result data', async () => {
    const slug = gzipSync(JSON.stringify({ name: 'Mageblood' })).toString('base64url')
    expect(await searchItemName(slug, 'Original Sin')).toBe('Mageblood')
    const generic = gzipSync(JSON.stringify({ stats: [] })).toString('base64url')
    expect(await searchItemName(generic, 'Original Sin')).toBe('')
})
it('uses the search field for short links', async () => {
    expect(await searchItemName('abc123', 'Original Sin')).toBe('Original Sin')
})
it('lists variants once and hides irrelevant names', () => {
    const base = {
        name: 'Mageblood',
        baseType: 'Heavy Belt',
        category: 'unique-accessories',
        sparkLine: { data: [0, 1] },
    }
    const prices = [2, 3, 4, 5].map((n) => ({
        ...base,
        variant: `${n} Flasks`,
        detailsId: `mageblood-${n}-flasks-heavy-belt`,
    }))
    expect(searchTrendPrices([...prices, prices[0]], 'Mageblood')).toHaveLength(4)
    expect(searchTrendPrices(prices, 'Sadist Garb')).toEqual([])
})

it.each(['Sadist Garb', 'Minion Life Support', { option: "The Searing Exarch's Invitation" }])(
    'reads non-unique type searches',
    async (type) => {
        const slug = gzipSync(JSON.stringify({ query: { type } })).toString('base64url')
        expect(await searchItemName(slug, '')).toBe(typeof type === 'string' ? type : type.option)
    }
)

it('keeps unique names ahead of their base types', async () => {
    const slug = gzipSync(JSON.stringify({ name: 'Mageblood', type: 'Heavy Belt' })).toString(
        'base64url'
    )
    expect(await searchItemName(slug, '')).toBe('Mageblood')
})

it('reads the reported PoE2 Mageblood search', async () => {
    expect(
        await searchItemName(
            'H4sIAAAAAAAAEzWMMQ6AIBAEv2K25gWU9pZWhuLU05CcYOQsCOHvQmE7M5mCpKRvgi2It_oYYJF4ex9ahVENAl3c2EQnrxLjDgPNd0ezevGah5FFG-2j9lnK7yn0-PCi_HThqqsfsyiZbHAAAAA',
            ''
        )
    ).toBe('Mageblood')
})

it('resolves transfigured and Trarthus names from trade item metadata', async () => {
    const fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({
            result: [
                {
                    entries: [
                        {
                            type: 'Forbidden Rite',
                            text: 'Forbidden Rite of Soul Sacrifice',
                            disc: 'alt_x',
                        },
                        { type: 'Bladefall', text: 'Bladefall of Trarthus', disc: 'alt_z' },
                    ],
                },
            ],
        }),
    }))
    vi.stubGlobal('fetch', fetch)
    try {
        const slug =
            'H4sIAAAAAAAAE1WMSwqDMBCGryL_2hN4AA_QrUiZmBEG0kQmE7CE3N0Euun6e1RkIysZS0W6TFLEgsxHUXKB0WbY9-I_uiZ14j3H6SXGmOElHyofiWRJu0DB3vdIx7qft_qbgKLv_inBWAfY294eMQpWnoIAAAA'
        expect(await searchItemName(slug, '')).toBe('Forbidden Rite of Soul Sacrifice')
        const bladefall = gzipSync(
            JSON.stringify({ type: { option: 'Bladefall', discriminator: 'alt_z' } })
        ).toString('base64url')
        expect(await searchItemName(bladefall, '')).toBe('Bladefall of Trarthus')
        const unknown = gzipSync(
            JSON.stringify({ type: { option: 'Bladefall', discriminator: 'unknown' } })
        ).toString('base64url')
        expect(await searchItemName(unknown, '')).toBe('')
        expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
        vi.unstubAllGlobals()
    }
})

it('returns no item name when runtime metadata requests fail', async () => {
    vi.resetModules()
    const { searchItemName: searchWithFreshMetadataCache } =
        await import('../../../src/integrations/poe-trade/searchQuery')
    const fetch = vi.fn(async () => {
        throw new Error('Network unavailable')
    })
    vi.stubGlobal('fetch', fetch)
    try {
        const slug = gzipSync(
            JSON.stringify({ type: { option: 'Bladefall', discriminator: 'alt_z' } })
        ).toString('base64url')
        expect(await searchWithFreshMetadataCache(slug, '')).toBe('')
        expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
        vi.unstubAllGlobals()
    }
})
