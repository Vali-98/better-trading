import { expect, it } from 'vitest'
import { trendVariantDetails } from './variantLabel'
const price = {
    name: 'Bladefall of Trarthus',
    baseType: '',
    detailsId: 'example',
    category: 'skill-gems',
    sparkLine: { data: [0, 1] },
}
it.each([
    ['21/20', 'Lv. 21 · Q 20', false],
    ['21/20c', 'Lv. 21 · Q 20', true],
    ['21c', 'Lv. 21', true],
    ['1', 'Lv. 1', false],
    ['1/20', 'Lv. 1 · Q 20', false],
    ['Special variant', 'Special variant', false],
])('formats gem variant %s', (variant, label, corrupted) => {
    expect(trendVariantDetails({ ...price, variant })).toEqual({ label, corrupted })
})
it('leaves numeric non-gem variants unchanged', () => {
    expect(
        trendVariantDetails({ ...price, category: 'unique-accessories', variant: '21/20' }).label
    ).toBe('21/20')
})
