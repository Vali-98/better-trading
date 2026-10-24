import { describe, expect, it } from 'vitest'
import { selectedForbiddenPassives } from '../../../../src/integrations/poe-trade/uniqueItems/forbiddenPassiveSelection'
import { searchTrendPrices } from '../../../../src/features/trends/matchPrices'
import { parseItemPrices } from '../../../../src/integrations/poe-ninja/items'
import { trendVariantLabel } from '../../../../src/features/trends/variantLabel'

const catalog = [
    {
        id: 'explicit.flame|1',
        text: 'Allocates Unleashed Potential if you have the matching modifier on Forbidden Flesh',
        type: 'explicit',
    },
    {
        id: 'explicit.flesh|1',
        text: 'Allocates Unleashed Potential if you have the matching modifier on Forbidden Flame',
        type: 'explicit',
    },
    {
        id: 'explicit.flame|2',
        text: 'Allocates Other Passive if you have the matching modifier on Forbidden Flesh',
        type: 'explicit',
    },
]
const filter = { id: 'explicit.flame', value: { option: 1 } }
const query = (filters: unknown[], extra = {}) => ({ stats: [{ type: 'and', filters, ...extra }] })
describe('Forbidden Jewel search trends', () => {
    it('resolves option and composite IDs, including multiple selected passives', () => {
        expect(
            selectedForbiddenPassives(
                query([filter, { id: 'explicit.flame|2' }]),
                'Forbidden Flame',
                catalog
            )
        ).toEqual(['Unleashed Potential', 'Other Passive'])
        expect(
            selectedForbiddenPassives(
                query([{ id: 'explicit.flesh|1' }]),
                'Forbidden Flesh',
                catalog
            )
        ).toEqual(['Unleashed Potential'])
    })
    it('ignores exclusions, disabled filters and groups, optional counts and opposite jewels', () => {
        for (const q of [
            query([filter], { type: 'not' }),
            query([filter], { disabled: true }),
            query([{ ...filter, disabled: true }]),
            query([filter], { type: 'count', value: { min: 0 } }),
            query([{ id: 'explicit.flesh|1' }]),
            {},
        ]) {
            expect(selectedForbiddenPassives(q, 'Forbidden Flame', catalog)).toEqual([])
        }
    })
    it('normalizes API passive metadata and limits trends to selected passives and jewel', () => {
        const prices = parseItemPrices(
            {
                lines: catalog.map((entry, i) => ({
                    name: i === 2 ? 'Other Passive' : 'Unleashed Potential',
                    metadata: { passiveName: i === 2 ? 'Other Passive' : 'Unleashed Potential' },
                    variant: i === 1 ? 'Forbidden Flesh' : 'Forbidden Flame',
                    detailsId: entry.id,
                    sparkLine: { data: [0, 1] },
                })),
            },
            'forbidden-jewels'
        )
        expect(searchTrendPrices(prices, 'Forbidden Flame')).toEqual([])
        const matches = searchTrendPrices(prices, 'Forbidden Flame', ['Unleashed Potential'])
        expect(matches).toHaveLength(1)
        expect(matches[0].passiveName).toBe('Unleashed Potential')
        expect(trendVariantLabel(matches[0])).toBe('Unleashed Potential')
    })
})
