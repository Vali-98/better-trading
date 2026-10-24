import { requestOverview } from '../../integrations/poe-ninja/http'
import { reportIntegrationIssue } from '../../integrations/diagnostics'
import { browser } from 'wxt/browser'
import { parseItemPrices } from '../../integrations/poe-ninja/items'
import { itemCategories } from '../../integrations/poe-ninja/categories'
import type { ItemPrice, ItemPriceOverview } from '../../models/priceTrend'

const pending = new Map<string, Promise<ItemPriceOverview>>()
const ttl = 3_600_000

export function fetchItemPrices(version: '1' | '2', league: string) {
    const key = `poe-ninja-item-categories-v1--${version}--${league}`
    const existing = pending.get(key)
    if (existing) return existing
    const request = (async () => {
        const prices: ItemPrice[] = []
        let complete = true
        let limited = false
        for (const [type, category] of Object.entries(itemCategories[version])) {
            const categoryKey = `${key}--${type}`
            let cached: { value: ItemPrice[]; expires: number } | undefined
            try {
                const value = (await browser.storage.local.get(categoryKey))[categoryKey]
                if (
                    value &&
                    typeof value === 'object' &&
                    'value' in value &&
                    Array.isArray(value.value) &&
                    'expires' in value &&
                    typeof value.expires === 'number'
                )
                    cached = { value: value.value as ItemPrice[], expires: value.expires }
            } catch {
                // A cache failure must not prevent a network request.
            }
            if (cached && cached.expires > Date.now()) {
                prices.push(...cached.value)
                continue
            }
            let fresh: ItemPrice[] | undefined
            if (!limited) {
                try {
                    const response = await requestOverview(
                        version,
                        league,
                        'stash/current/item',
                        type
                    )
                    if (response.status === 429) limited = true
                    if (!response.ok) throw new Error('Overview unavailable')
                    const data: unknown = await response.json()
                    if (
                        !data ||
                        typeof data !== 'object' ||
                        !('lines' in data) ||
                        !Array.isArray(data.lines)
                    )
                        throw new Error('Invalid overview')
                    fresh = parseItemPrices(data, category)
                } catch {
                    reportIntegrationIssue('poe-ninja', `Item overview request failed (${type})`)
                }
            }
            if (fresh !== undefined) {
                prices.push(...fresh)
                try {
                    await browser.storage.local.set({
                        [categoryKey]: { value: fresh, expires: Date.now() + ttl },
                    })
                } catch {
                    // Return fresh data even when storage is full.
                }
            } else {
                complete = false
                if (cached) prices.push(...cached.value)
            }
        }
        return { prices, complete }
    })()
    pending.set(key, request)
    void request.finally(() => pending.delete(key)).catch(() => {})
    return request
}
