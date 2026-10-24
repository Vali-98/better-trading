import { useState } from 'react'
import { Icon } from '../../components/Icon'
import type { ItemPrice } from '../../models/priceTrend'
import { variantSearch } from './variantSearch'

export function ApplyVariantButton({
    price,
    prices,
    version,
}: {
    price: ItemPrice
    prices: ItemPrice[]
    version: '1' | '2'
}) {
    const action = variantSearch(price, prices, version)
    const [message, setMessage] = useState<string>()
    if (!action) return null
    const label = message ?? action.label
    return (
        <button
            type="button"
            className="bt-trend-apply"
            title={label}
            aria-label={label}
            onClick={async () => {
                const warnings = await action.run()
                setMessage(warnings.length ? warnings.join(' ') : 'Search submitted')
            }}>
            <Icon name="search" />
        </button>
    )
}
