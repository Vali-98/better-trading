import { expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
vi.mock('wxt/browser', () => ({
    browser: {
        runtime: {
            sendMessage: vi.fn(async () => ({
                lines: [
                    { id: 'chaos', primaryValue: 0.1 },
                    { id: 'divine', primaryValue: 1 },
                    { id: 'exalted', primaryValue: 0.002 },
                ],
                items: [
                    { id: 'chaos', detailsId: 'chaos-orb' },
                    { id: 'divine', detailsId: 'divine-orb' },
                    { id: 'exalted', detailsId: 'exalted-orb' },
                ],
            })),
        },
        storage: { local: { get: async () => ({}), set: async () => {} } },
    },
}))
import { browser } from 'wxt/browser'
import { getCurrencyRatios } from '../../../src/lib/prices/currencyRatios'
import { currentLocation } from '../../../src/integrations/poe-trade/location'

it('uses a decoded PoE2 PC league and converts divine reference prices into chaos ratios', async () => {
    const result = await getCurrencyRatios(
        new QueryClient(),
        currentLocation('/trade2/search/poe2/Forbidden%20Rites/test')
    )
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        query: 'currency-ratios',
        version: '2',
        league: 'Forbidden Rites',
    })
    expect(result['chaos-orb']).toBe(1)
    expect(result['divine-orb']).toBe(10)
    expect(result['exalted-orb']).toBe(0.02)
})
