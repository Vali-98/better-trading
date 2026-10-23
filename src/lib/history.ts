import { currentLocation } from './bookmarks/storage'
import { recommendTitle } from './searchPanel'
import { getValue, setValue } from './storage'

export interface HistoryEntry {
    id: string
    version: '1' | '2'
    type: string
    league: string
    slug: string
    title: string
    createdAt: string
}

export async function getHistory() {
    return ((await getValue<HistoryEntry[]>('trade-history')) ?? []).map((entry) => ({
        ...entry,
        version: entry.version ?? '1',
    }))
}

export async function recordCurrentSearch() {
    const context = currentLocation()
    if (!context.slug || !context.type || !context.league) return false
    const history = await getHistory()
    const alreadyCurrent =
        history[0] &&
        ['version', 'type', 'league', 'slug'].every(
            (key) => history[0][key as keyof HistoryEntry] === context[key as keyof typeof context]
        )
    if (alreadyCurrent) return false
    await setValue(
        'trade-history',
        [
            {
                ...context,
                id: crypto.randomUUID(),
                title: recommendTitle(),
                createdAt: new Date().toISOString(),
            },
            ...history,
        ].slice(0, 50)
    )
    return true
}
