import { economyLeague } from '../../integrations/poe-ninja/league'
import { decodeCurrencyOverview } from '../../integrations/poe-ninja/currency'
import type { QueryClient } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import { currentLocation } from '../../integrations/poe-trade/location'
import { getValue } from '../storage'

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
type Location = ReturnType<typeof currentLocation>

export async function getCurrencyRatios(client: QueryClient, context: Location) {
    const league = economyLeague(context.league)
    if (!league) return {}
    return client.fetchQuery({
        queryKey: ['poe-ninja', 'ratios', context.version, league],
        staleTime: 3_600_000,
        retry: false,
        queryFn: async () => {
            const key = `poe-ninja-chaos-ratios-v3--${context.version}--${league.toLowerCase()}`
            const cached = await getValue<Record<string, number>>(key)
            if (cached) return cached
            const data = decodeCurrencyOverview(
                await browser.runtime.sendMessage({
                    query: 'currency-ratios',
                    version: context.version,
                    league,
                })
            )
            if (!data) throw new Error('Unable to fetch currency ratios')
            const chaos =
                data.lines.find((line) => line.id === 'chaos' || line.id === 'chaos-orb')
                    ?.primaryValue ?? 1
            const ratios = Object.fromEntries(
                data.lines.map((line) => [
                    slugify(
                        data.items.find((item) => item.id === line.id)?.detailsId ?? String(line.id)
                    ),
                    line.primaryValue / chaos,
                ])
            )
            await browser.storage.local.set({
                [key]: { value: ratios, expiresAt: new Date(Date.now() + 3_600_000).toUTCString() },
            })
            return ratios
        },
    })
}
