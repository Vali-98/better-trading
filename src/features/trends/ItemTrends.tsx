import { useItemTrends } from './useItemTrends'
import { trendVariantLabel } from './variantLabel'
import { TrendRow } from './TrendRow'

export function ItemTrends() {
    const { enabled, search, prices } = useItemTrends()
    const hasVariants = prices.some((price) => Boolean(trendVariantLabel(price)))
    if (!enabled || !search || !prices.length) return null
    return (
        <details className="bt-unique-trends" key={search.key} open>
            <summary>
                <span className="bt-trends-name">{search.name}</span>
                <span className="bt-trends-source">poe.ninja</span>
            </summary>
            <ul>
                {prices.map((price) => (
                    <TrendRow
                        key={`${price.category}/${price.detailsId}`}
                        price={price}
                        prices={prices}
                        version={search.version}
                        league={search.league}
                        hasVariants={hasVariants}
                    />
                ))}
            </ul>
        </details>
    )
}
