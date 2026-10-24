import { economyLeagueSlug } from './league'
import type { ItemPrice } from '../../models/priceTrend'

export function economyItemUrl(
    version: '1' | '2',
    league: string,
    item: Pick<ItemPrice, 'category' | 'detailsId'>
) {
    return `https://poe.ninja/poe${version}/economy/${economyLeagueSlug(league)}/${item.category}/${encodeURIComponent(item.detailsId)}`
}
