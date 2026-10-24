import { subscribePageUpdates } from '../../lib/page/updates'
import { economyLeague } from '../../integrations/poe-ninja/league'
import { searchItemName } from '../../integrations/poe-trade/searchQuery'
import { searchForbiddenPassives } from '../../integrations/poe-trade/uniqueItems/forbiddenJewels'
import { isForbiddenJewel } from '../../integrations/poe-trade/uniqueItems/forbiddenPassiveSelection'

export interface TrendSearch {
    key: string
    name: string
    passives?: string[]
    league: string
    version: '1' | '2'
}

// A failed resolution is retried only when the user changes the search/filter state.
export function watchTrendSearch(onSearch: (search: TrendSearch | undefined) => void) {
    let stopped = false
    let previous = ''
    let generation = 0
    const unsubscribe = subscribePageUpdates(async ({ context: page }) => {
        const context = page.location
        const key = `${page.pathname}|${page.itemText}|${page.statsKey}`
        if (key === previous) return
        previous = key
        const current = ++generation
        onSearch(undefined)
        const league = economyLeague(context.league)
        if (context.type !== 'search' || !league) return
        const name = await searchItemName(context.slug, page.itemText, context.version)
        const passives =
            name && isForbiddenJewel(name)
                ? await searchForbiddenPassives(context.slug, name, context.version)
                : undefined
        if (passives && !passives.length) return
        if (!stopped && current === generation && name)
            onSearch({ key, name, league, version: context.version, passives })
    }, 'Trend search resolution')
    return () => {
        stopped = true
        unsubscribe()
    }
}
