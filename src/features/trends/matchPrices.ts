import { isForbiddenJewel } from '../../integrations/poe-trade/uniqueItems/forbiddenJewels'
import type { ItemPrice } from '../../models/priceTrend'

export function searchTrendPrices(prices: ItemPrice[], name: string, passives: string[] = []) {
    const selected = new Set(passives.map((passive) => passive.toLowerCase()))
    const matches = prices.filter((price) =>
        isForbiddenJewel(name)
            ? price.category === 'forbidden-jewels' &&
              price.variant?.toLowerCase() === name.toLowerCase() &&
              selected.has((price.passiveName ?? price.name).toLowerCase())
            : price.name.toLowerCase() === name.toLowerCase()
    )
    return Array.from(
        new Map(matches.map((price) => [`${price.category}/${price.detailsId}`, price])).values()
    )
}
