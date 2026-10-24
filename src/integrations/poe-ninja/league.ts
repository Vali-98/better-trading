// Trade routes include a realm prefix and URL-encoded league names; ninja expects
// the decoded PC league name. Console economies are not interchangeable with PC.
export function economyLeague(tradeLeague: string | undefined): string | undefined {
    if (!tradeLeague) return undefined
    try {
        const league = decodeURIComponent(tradeLeague).replace(/^poe2\//, '')
        return league && !league.includes('/') ? league : undefined
    } catch {
        return undefined
    }
}

export function economyLeagueSlug(league: string) {
    return encodeURIComponent(league.toLowerCase().replace(/\s+/g, '-'))
}
