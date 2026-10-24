import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseItemPrices } from '../../../src/integrations/poe-ninja/items'
import { trendVariantLabel } from '../../../src/features/trends/variantLabel'
import { itemCategories } from '../../../src/integrations/poe-ninja/categories'
import { disabledItemCategories } from '../../../src/integrations/poe-ninja/categories'
import type { ItemPrice } from '../../../src/models/priceTrend'
const price: ItemPrice = {
    name: 'Original Sin',
    baseType: 'Amethyst Ring',
    detailsId: 'original-sin-amethyst-ring',
    category: 'unique-accessories',
    sparkLine: { data: [0, 2, null, -5], totalChange: -5 },
}
it('parses the live overview shape and rejects invalid or insufficient trends', () => {
    expect(
        parseItemPrices(
            { lines: [price, { ...price, sparkLine: { data: [null, 0] } }] },
            'unique-accessories'
        )
    ).toHaveLength(1)
    expect(parseItemPrices(null, 'unique-accessories')).toEqual([])
})

it('accepts gems and bases without baseType and preserves variant metadata', () => {
    const lines = [
        {
            name: 'Minion Life Support',
            detailsId: 'minion-life-support-21-20',
            gemLevel: 21,
            gemQuality: 20,
            sparkLine: { data: [0, 1] },
        },
        {
            name: 'Sadist Garb',
            detailsId: 'sadist-garb-86',
            levelRequired: 86,
            sparkLine: { data: [0, 2] },
        },
    ]
    expect(parseItemPrices({ lines: [lines[0]] }, 'skill-gems')[0]).toMatchObject({
        baseType: '',
        gemLevel: 21,
        gemQuality: 20,
    })
    expect(parseItemPrices({ lines: [lines[1]] }, 'base-types')[0]).toMatchObject({
        itemLevel: 86,
    })
})

it('labels non-unique variants', () => {
    expect(trendVariantLabel({ ...price, gemLevel: 21, gemQuality: 20 })).toBe('Lv. 21 · Q 20')
    expect(trendVariantLabel({ ...price, itemLevel: 86, variant: 'Shaper' })).toBe(
        'Shaper · ilvl 86'
    )
    expect(trendVariantLabel({ ...price, mapTier: 16 })).toBe('Tier 16')
})
it('only enables the agreed categories and retains the legacy gem stub', () => {
    expect(itemCategories['1']).toHaveProperty('BaseType')
    expect(itemCategories['1']).toHaveProperty('SkillGem')
    expect(itemCategories['1']).toHaveProperty('Wombgift')
    expect(itemCategories['1']).toHaveProperty('Vial')
    expect(itemCategories['1']).not.toHaveProperty('ImbuedGem')
    expect(itemCategories['1']).not.toHaveProperty('Map')
    expect(itemCategories['1']).not.toHaveProperty('Flask')
    expect(itemCategories['1']).not.toHaveProperty('Incubator')
    expect(disabledItemCategories['1']).toHaveProperty('ImbuedGem')
    expect(itemCategories['2']).toHaveProperty('PrecursorTablets')
})

it('decodes the captured economy fixture', () => {
    const fixture = JSON.parse(
        readFileSync(new URL('./fixtures/items.json', import.meta.url), 'utf8')
    )
    const prices = parseItemPrices(fixture, 'unique-accessories')
    expect(prices).toHaveLength(2)
    expect(prices[0].variant).toBe('5 Flasks')
    expect(prices[1].sparkLine.data).toHaveLength(7)
})

it('decodes the live PoE2 item response and nullable trend samples', () => {
    const fixture = JSON.parse(
        readFileSync(new URL('./fixtures/poe2-items.json', import.meta.url), 'utf8')
    )
    const prices = parseItemPrices(fixture, 'unique-accessories')
    expect(prices[0].name).toBe('The Gnashing Sash')
    expect(prices[0].sparkLine.data).toHaveLength(7)
    expect(prices[0].sparkLine.data).toContain(null)
})

it('uses divine prices for valuable PoE1 items and chaos for cheaper items', () => {
    const line = {
        name: 'Example',
        detailsId: 'example',
        sparkLine: { data: [0, 1] },
        chaosValue: 400,
        divineValue: 2,
    }
    expect(parseItemPrices({ lines: [line] }, 'unique-accessories')[0].price).toEqual({
        amount: 2,
        currency: 'Divine Orb',
    })
    expect(
        parseItemPrices(
            { lines: [{ ...line, chaosValue: 40, divineValue: 0.2 }] },
            'unique-accessories'
        )[0].price
    ).toEqual({ amount: 40, currency: 'Chaos Orb' })
})
it('labels PoE2 prices using the API primary currency', () => {
    const response = {
        core: { primary: 'divine', items: [{ id: 'divine', name: 'Divine Orb' }] },
        lines: [
            {
                name: 'Mageblood',
                detailsId: 'mageblood',
                primaryValue: 125,
                sparkLine: { data: [0, 1] },
            },
        ],
    }
    expect(parseItemPrices(response, 'unique-accessories')[0].price).toEqual({
        amount: 125,
        currency: 'Divine Orb',
    })
})
