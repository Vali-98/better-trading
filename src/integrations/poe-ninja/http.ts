import { reportIntegrationIssue } from '../diagnostics'

export function requestOverview(
    version: '1' | '2',
    league: string,
    source: 'stash/current/item' | 'exchange/current',
    type: string
) {
    return fetch(
        `https://poe.ninja/poe${version}/api/economy/${source}/overview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`,
        {
            signal: AbortSignal.timeout(15000),
            headers: {
                'User-Agent': 'BetterTrading/0.1.3 (+https://github.com/poe-world/better-trading)',
            },
        }
    )
}

export async function fetchCurrencyOverview(version: '1' | '2', league: string) {
    try {
        const response = await requestOverview(version, league, 'exchange/current', 'Currency')
        if (!response.ok) throw new Error('Currency request failed')
        return await response.json()
    } catch {
        reportIntegrationIssue('poe-ninja', 'Currency overview request failed')
        return null
    }
}
