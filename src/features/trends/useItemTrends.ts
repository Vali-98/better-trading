import { watchTrendSearch, type TrendSearch } from './watchTrendSearch'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import { searchTrendPrices } from './matchPrices'
import type { ItemPriceOverview } from '../../models/priceTrend'
import { useSettingsStore } from '../../stores/settings'

export function useItemTrends() {
    const enabled = !useSettingsStore((state) => state.disabled.includes('unique-price-sparklines'))
    const [search, setSearch] = useState<TrendSearch>()
    useEffect(() => {
        if (!enabled) {
            setSearch(undefined)
            return
        }
        return watchTrendSearch(setSearch)
    }, [enabled])
    const { data } = useQuery<ItemPriceOverview>({
        queryKey: ['poe-ninja', 'item-sparklines-v7', search?.version, search?.league, search?.key],
        enabled: enabled && Boolean(search),
        staleTime: (query) => (query.state.data?.complete ? 3_600_000 : 0),
        retry: false,
        queryFn: async () => {
            const response = await browser.runtime.sendMessage({
                query: 'item-sparklines',
                version: search!.version,
                league: search!.league,
            })
            if (
                !response ||
                !Array.isArray(response.prices) ||
                typeof response.complete !== 'boolean'
            )
                throw new Error('Item trends unavailable')
            return response
        },
    })
    const prices =
        search && data ? searchTrendPrices(data.prices, search.name, search.passives) : []
    return { enabled, search, prices }
}
