import { fetchCurrencyOverview } from '../integrations/poe-ninja/http'
import { fetchItemPrices } from '../integrations/poe-ninja/client'
import { browser } from 'wxt/browser'
export default defineBackground(() => {
    browser.runtime.onMessage.addListener((request: unknown) => {
        const input = request as {
            query?: string
            version?: string
            league?: string
        }
        if (
            input?.query === 'item-sparklines' &&
            (input.version === '1' || input.version === '2') &&
            typeof input.league === 'string' &&
            input.league.length < 100
        )
            return fetchItemPrices(input.version, input.league).catch(() => [])
        if (input?.query !== 'currency-ratios') return
        if ((input.version !== '1' && input.version !== '2') || typeof input.league !== 'string')
            return Promise.resolve(null)
        return fetchCurrencyOverview(input.version, input.league)
    })
})
