import { expect, it } from 'vitest'
import {
    withMagebloodFilter,
    resolveNinjaFlaskStat,
} from '../../../../src/integrations/poe-trade/uniqueItems/magebloodFilters'
import {
    encodeSearchQuery,
    decodeSearchQuery,
} from '../../../../src/integrations/poe-trade/encodedQuery'

it('sets exact flask counts while preserving other filters and the source query', () => {
    const query = {
        name: 'Mageblood',
        filters: { trade_filters: { filters: { price: { max: 200 } } } },
        stats: [
            {
                type: 'and',
                filters: [
                    { id: 'left', value: { min: 2 } },
                    { id: 'life', value: { min: 50 } },
                ],
            },
        ],
    }
    const updated = withMagebloodFilter(query, 5, 'left', 'right')
    expect(updated.filters).toEqual(query.filters)
    expect(updated.stats).toEqual([
        { type: 'and', filters: [{ id: 'life', value: { min: 50 } }] },
        { type: 'and', filters: [{ id: 'left', value: { min: 5, max: 5 } }] },
    ])
    expect(query.stats[0].filters[0].value).toEqual({ min: 2 })
})
it('uses the selected rightmost stat for Foulborn and removes conflicting flask constraints', () => {
    const result = withMagebloodFilter(
        { name: 'Foulborn Mageblood', stats: [{ type: 'and', filters: [{ id: 'left' }] }] },
        3,
        'right',
        'left'
    )
    expect(JSON.stringify(result.stats)).toContain('"id":"right","value":{"min":3,"max":3}')
    expect(JSON.stringify(result.stats)).not.toContain('"id":"left"')
})
it('does not rewrite advanced count/or stat groups silently', () => {
    expect(() =>
        withMagebloodFilter({ stats: [{ type: 'count', filters: [{ id: 'left' }] }] }, 4, 'left')
    ).toThrow('advanced stat group')
})
it('round-trips an updated encoded search', async () => {
    const query = withMagebloodFilter(
        { name: 'Mageblood', status: { option: 'securable' } },
        4,
        'left'
    )
    expect(await decodeSearchQuery(await encodeSearchQuery(query))).toEqual(query)
})

it('cross-references ninja stat IDs and modifier text against the catalog', () => {
    const catalog = [
        {
            id: 'explicit.left',
            text: 'Leftmost # Magic Utility Flask constantly applies its Flask Effect to you',
            type: 'explicit',
        },
        {
            id: 'explicit.right',
            text: 'Rightmost # Magic Utility Flask constantly applies its Flask Effect to you',
            type: 'explicit',
        },
    ]
    const base = {
        name: 'Mageblood',
        baseType: 'Heavy Belt',
        category: 'unique-accessories',
        detailsId: 'test',
        sparkLine: { data: [0, 1] },
    }
    const prices = [
        {
            ...base,
            variant: '4 Flasks',
            explicitModifiers: [
                'Leftmost 4 Magic Utility Flasks constantly apply their Flask Effects to you',
            ],
        },
        {
            ...base,
            name: 'Foulborn Mageblood',
            variant: '3 Flasks',
            tradeStatIds: ['explicit.right'],
        },
        { ...base, variant: '5 Flasks' },
    ]
    expect(resolveNinjaFlaskStat(prices, 'Mageblood', catalog)).toBe('explicit.left')
    expect(resolveNinjaFlaskStat(prices, 'Foulborn Mageblood', catalog)).toBe('explicit.right')
    expect(resolveNinjaFlaskStat([{ ...base }], 'Mageblood', catalog)).toBeUndefined()
})
