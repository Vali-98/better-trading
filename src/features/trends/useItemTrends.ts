import { economyLeague } from '../../integrations/poe-ninja/league'
import { itemSearchText } from '../../integrations/poe-trade/searchInputs'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import { currentLocation } from '../../integrations/poe-trade/location'
import { searchItemName } from '../../integrations/poe-trade/searchQuery'
import { searchTrendPrices } from './matchPrices'
import type { ItemPrice } from '../../models/priceTrend'
import { useSettingsStore } from '../../stores/settings'

export function useItemTrends() {
    const enabled = !useSettingsStore((state) => state.disabled.includes('unique-price-sparklines'))
    const [search, setSearch] = useState<{
        key: string
        name: string
        league: string
        version: '1' | '2'
    }>()
    useEffect(() => {
        if (!enabled) {
            setSearch(undefined)
            return
        }
        let stopped = false
        let previous = ''
        const update = async () => {
            const context = currentLocation()
            const fallback = itemSearchText()
            const key = `${location.pathname}|${fallback}`
            if (key === previous) return
            previous = key
            setSearch(undefined)
            const league = economyLeague(context.league)
            if (context.type !== 'search' || !league) return
            const name = await searchItemName(context.slug, fallback)
            if (!stopped && key === previous && name)
                setSearch({ key, name, league, version: context.version })
        }
        void update()
        const timer = setInterval(() => void update(), 500)
        return () => {
            stopped = true
            clearInterval(timer)
        }
    }, [enabled])
    const { data } = useQuery<ItemPrice[]>({
        queryKey: ['poe-ninja', 'item-sparklines-v3', search?.version, search?.league],
        enabled: enabled && Boolean(search),
        staleTime: 3_600_000,
        retry: false,
        queryFn: async () => {
            const response = await browser.runtime.sendMessage({
                query: 'item-sparklines',
                version: search!.version,
                league: search!.league,
            })
            if (!Array.isArray(response)) throw new Error('Unique trends unavailable')
            return response
        },
    })
    const prices = search && data ? searchTrendPrices(data, search.name) : []
    return { enabled, search, prices }
}
