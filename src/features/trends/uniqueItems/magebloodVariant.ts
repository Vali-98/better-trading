import type { ItemPrice } from '../../../models/priceTrend'

export function magebloodVariant(price: ItemPrice, version: '1' | '2') {
    if (version !== '1' || !['Mageblood', 'Foulborn Mageblood'].includes(price.name))
        return undefined
    const count = price.variant?.match(/^([2-5]) Flasks?$/i)?.[1]
    return count
        ? { count: Number(count), foulborn: price.name === 'Foulborn Mageblood' }
        : undefined
}
