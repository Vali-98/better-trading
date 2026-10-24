import { expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { searchItemName } from './searchQuery'
import { searchTrendPrices } from '../../features/trends/matchPrices'

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

it.each([
    'Sadist Garb',
    'Minion Life Support',
    { option: "The Searing Exarch's Invitation", discriminator: 'test' },
])('reads non-unique type searches', async (type) => {
    const slug = gzipSync(JSON.stringify({ query: { type } })).toString('base64url')
    expect(await searchItemName(slug, '')).toBe(typeof type === 'string' ? type : type.option)
})

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
