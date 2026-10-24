import type { ItemPrice } from '../../models/priceTrend'

export function searchTrendPrices(prices: ItemPrice[], name: string) {
    const matches = prices.filter((price) => price.name.toLowerCase() === name.toLowerCase())
    return Array.from(
        new Map(matches.map((price) => [`${price.category}/${price.detailsId}`, price])).values()
    )
}
