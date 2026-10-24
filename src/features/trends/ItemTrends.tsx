import { searchLinkedVariant } from '../../integrations/poe-trade/linkFilters'
import { magebloodVariant } from './uniqueItems/magebloodVariant'
import { searchMagebloodVariant } from '../../integrations/poe-trade/uniqueItems/magebloodFilters'
import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { searchGemVariant } from '../../integrations/poe-trade/gemFilters'
import { Tag } from '../../components/Tag'
import type { ItemPrice } from '../../models/priceTrend'
import { economyItemUrl } from '../../integrations/poe-ninja/links'
import { useItemTrends } from './useItemTrends'
import { Sparkline } from './Sparkline'
import { gemVariantValues, trendVariantDetails, trendVariantLabel } from './variantLabel'

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
                    <li key={`${price.category}/${price.detailsId}`}>
                        {(gemVariantValues(price) ||
                            magebloodVariant(price, search.version) ||
                            (search.version === '1' && price.links)) && (
                            <ApplyVariantButton
                                price={price}
                                prices={prices}
                                version={search.version}
                            />
                        )}
                        <a
                            href={economyItemUrl(search.version, search.league, price)}
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
                                        notation:
                                            price.price.amount >= 10000 ? 'compact' : 'standard',
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
                ))}
            </ul>
        </details>
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

function ApplyVariantButton({
    price,
    prices,
    version,
}: {
    price: ItemPrice
    prices: ItemPrice[]
    version: '1' | '2'
}) {
    const [message, setMessage] = useState(
        magebloodVariant(price, version)
            ? 'Search with this flask count'
            : price.links
              ? `Search for ${price.links} linked sockets`
              : 'Search with these gem level, quality and corruption filters'
    )
    return (
        <button
            type="button"
            className="bt-trend-apply"
            title={message}
            aria-label={message}
            onClick={async () => {
                const mageblood = magebloodVariant(price, version)
                const values = gemVariantValues(price)
                const links = version === '1' ? price.links : undefined
                if (!values && !mageblood && !links) return
                const warnings = mageblood
                    ? await searchMagebloodVariant(mageblood.count, mageblood.foulborn, prices)
                    : values
                      ? await searchGemVariant(values, version)
                      : await searchLinkedVariant(links!)
                setMessage(warnings.length ? warnings.join(' ') : 'Search submitted')
            }}>
            <Icon name="search" />
        </button>
    )
}
