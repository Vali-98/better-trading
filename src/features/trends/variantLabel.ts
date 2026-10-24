import type { ItemPrice } from '../../models/priceTrend'

export function trendVariantLabel(price: ItemPrice) {
    return [
        price.variant,
        !price.variant && price.gemLevel !== undefined ? `Level ${price.gemLevel}` : '',
        !price.variant && price.gemQuality !== undefined ? `${price.gemQuality}% quality` : '',
        price.itemLevel !== undefined ? `ilvl ${price.itemLevel}` : '',
        price.mapTier !== undefined ? `Tier ${price.mapTier}` : '',
        price.links ? `${price.links}L` : '',
        price.corrupted && !price.variant ? 'Corrupted' : '',
    ]
        .filter(Boolean)
        .join(' · ')
}
