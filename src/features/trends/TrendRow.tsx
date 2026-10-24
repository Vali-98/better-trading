import { Tag } from '../../components/Tag'
import type { ItemPrice } from '../../models/priceTrend'
import { economyItemUrl } from '../../integrations/poe-ninja/links'
import { Sparkline } from './Sparkline'
import { trendVariantDetails } from './variantLabel'
import { ApplyVariantButton } from './ApplyVariantButton'

export function TrendRow({
    price,
    prices,
    version,
    league,
    hasVariants,
}: {
    price: ItemPrice
    prices: ItemPrice[]
    version: '1' | '2'
    league: string
    hasVariants: boolean
}) {
    return (
        <li>
            <ApplyVariantButton price={price} prices={prices} version={version} />
            <a
                href={economyItemUrl(version, league, price)}
                target="_blank"
                rel="noopener noreferrer">
                {hasVariants && (
                    <span className="bt-trend-label">
                        <VariantLabel price={price} />
                    </span>
                )}
                {price.price && (
                    <span
                        className="bt-trend-price"
                        title={`${price.price.amount.toLocaleString()} ${price.price.currency}`}>
                        {new Intl.NumberFormat(undefined, {
                            maximumFractionDigits: 2,
                            notation: price.price.amount >= 10000 ? 'compact' : 'standard',
                        }).format(price.price.amount)}{' '}
                        <span>
                            {price.price.currency === 'Divine Orb'
                                ? 'div'
                                : price.price.currency === 'Chaos Orb'
                                  ? 'chaos'
                                  : price.price.currency}
                        </span>
                    </span>
                )}
                <Sparkline trend={price.sparkLine} large={!hasVariants} />
            </a>
        </li>
    )
}

function VariantLabel({ price }: { price: ItemPrice }) {
    const { label, corrupted } = trendVariantDetails(price)
    return (
        <>
            {label && (
                <span className="bt-trend-label-text" title={label}>
                    {label}
                </span>
            )}
            {corrupted && (
                <Tag theme="red" title="Corrupted">
                    C
                </Tag>
            )}
            {!label && !corrupted && 'Any'}
        </>
    )
}
