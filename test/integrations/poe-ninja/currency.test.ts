import { expect, it, vi } from 'vitest'
import { decodeCurrencyOverview } from '../../../src/integrations/poe-ninja/currency'

it('validates currency pricing data at the provider boundary', () => {
    expect(
        decodeCurrencyOverview({
            lines: [{ id: 'chaos', primaryValue: 1 }],
            items: [{ id: 'chaos', detailsId: 'chaos-orb' }],
        })
    ).toEqual({
        lines: [{ id: 'chaos', primaryValue: 1 }],
        items: [{ id: 'chaos', detailsId: 'chaos-orb' }],
    })
})
it('rejects changed schemas instead of allowing feature code to crash', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(decodeCurrencyOverview({ lines: [{ id: 'chaos', price: 1 }] })).toBeNull()
    expect(decodeCurrencyOverview({ lines: [], items: [] })).toEqual({ lines: [], items: [] })
    warn.mockRestore()
})
