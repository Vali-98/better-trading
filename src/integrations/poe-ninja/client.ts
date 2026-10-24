import { requestOverview } from './http'
import { reportIntegrationIssue } from '../diagnostics'
import { browser } from 'wxt/browser'
import { getValue } from '../../lib/storage'
import { parseItemPrices } from './items'
import { itemCategories } from './categories'
import type { ItemPrice } from '../../models/priceTrend'

const pending = new Map<string, Promise<ItemPrice[]>>()

export function fetchItemPrices(version: '1' | '2', league: string) {
    const key = `poe-ninja-item-trends-v6--${version}--${league}`
    const existing = pending.get(key)
    if (existing) return existing
    const request = (async () => {
        const cached = await getValue<ItemPrice[]>(key)
        if (cached) return cached
        const prices: ItemPrice[] = []
        let successful = 0
        for (const [type, category] of Object.entries(itemCategories[version])) {
            try {
                const response = await requestOverview(version, league, 'stash/current/item', type)
                if (response.status === 429) break
                if (!response.ok) continue
                prices.push(...parseItemPrices(await response.json(), category))
                successful++
            } catch {
                reportIntegrationIssue('poe-ninja', `Item overview request failed (${type})`)
            }
        }
        if (successful)
            await browser.storage.local.set({
                [key]: {
                    value: prices,
                    expiresAt: new Date(Date.now() + 3_600_000).toUTCString(),
                },
            })
        return prices
    })()
    pending.set(key, request)
    void request.finally(() => pending.delete(key)).catch(() => {})
    return request
}
