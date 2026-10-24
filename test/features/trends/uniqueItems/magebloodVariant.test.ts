import { expect, it } from 'vitest'
import { magebloodVariant } from '../../../../src/features/trends/uniqueItems/magebloodVariant'
const price = {
    name: 'Mageblood',
    baseType: 'Heavy Belt',
    category: 'unique-accessories',
    detailsId: 'mageblood',
    sparkLine: { data: [0, 1] },
}
it.each([2, 3, 4, 5])('recognizes the %i-flask variant', (count) => {
    expect(magebloodVariant({ ...price, variant: `${count} Flasks` }, '1')).toEqual({
        count,
        foulborn: false,
    })
    expect(
        magebloodVariant({ ...price, name: 'Foulborn Mageblood', variant: `${count} Flasks` }, '1')
    ).toEqual({ count, foulborn: true })
})
it('does not expose this PoE1-specific mapping for PoE2 or unrelated variants', () => {
    expect(magebloodVariant({ ...price, variant: '4 Flasks' }, '2')).toBeUndefined()
    expect(magebloodVariant({ ...price, variant: 'Unknown' }, '1')).toBeUndefined()
})
