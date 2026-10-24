import { economyItemUrl } from '../../integrations/poe-ninja/links'
import { useItemTrends } from './useItemTrends'
import { Sparkline } from './Sparkline'
import { trendVariantLabel } from './variantLabel'

export function ItemTrends() {
    const { enabled, search, prices } = useItemTrends()
    const hasVariants = prices.some((price) => Boolean(trendVariantLabel(price)))
    if (!enabled || !search || !prices.length) return null
    return (
        <details className="bt-unique-trends" key={search.key} open>
            <summary>
                <span className="bt-trends-source">poe.ninja</span>
                <span className="bt-trends-name">{search.name}</span>
            </summary>
            <ul>
                {prices.map((price) => (
                    <li key={`${price.category}/${price.detailsId}`}>
                        <a
                            href={economyItemUrl(search.version, search.league, price)}
                            target="_blank"
                            rel="noopener noreferrer">
                            {hasVariants && (
                                <span className="bt-trend-label">
                                    {trendVariantLabel(price) || 'Any'}
                                </span>
                            )}
                            <Sparkline trend={price.sparkLine} large={!hasVariants} />
                        </a>
                    </li>
                ))}
            </ul>
        </details>
    )
}
