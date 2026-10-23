import type { QueryClient } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import type { currentLocation } from '../bookmarks/storage'
import { getValue } from '../storage'

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
type Location = ReturnType<typeof currentLocation>
type CurrencyResponse = {
    lines: { id: string; primaryValue: number }[]
    items: { id: string; detailsId: string }[]
}

export async function getCurrencyRatios(client: QueryClient, context: Location) {
    if (!context.league) return {}
    return client.fetchQuery({
        queryKey: ['poe-ninja', 'ratios', context.version, context.league],
        staleTime: 3_600_000,
        retry: false,
        queryFn: async () => {
            const key = `poe-ninja-chaos-ratios-v2--${context.version}--${context.league!.toLowerCase()}`
            const cached = await getValue<Record<string, number>>(key)
            if (cached) return cached
            const data = (await browser.runtime.sendMessage({
                query: 'currency-ratios',
                version: context.version,
                league: context.league,
            })) as CurrencyResponse | null
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
