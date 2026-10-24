import { subscribePageUpdates } from './page/updates'
import type { QueryClient } from '@tanstack/react-query'
import { currentLocation } from '../integrations/poe-trade/location'
import { getFolders, getTrades } from './bookmarks/storage'
import { recordCurrentSearch } from './history'
import { recommendTitle } from '../integrations/poe-trade/searchPanel'

export function startPageController(client: QueryClient) {
    let previous = ''
    let stopped = false
    let title = ''
    const baseTitle = document.title.replace(/^\(\d+\) /, '')
    let running = false
    let pending = false
    let titleTimer: ReturnType<typeof setTimeout> | undefined
    const writeTitle = () => {
        if (stopped || !title) return
        const count = document.title.match(/^\(\d+\) /)?.[0] ?? ''
        if (document.title !== count + title) document.title = count + title
    }
    async function update() {
        if (stopped || !document.hasFocus()) return
        if (running) {
            pending = true
            return
        }
        running = true
        try {
            if (previous !== location.pathname) {
                previous = location.pathname
                void client.invalidateQueries({ queryKey: ['bookmarks'] })
                if (await recordCurrentSearch())
                    void client.invalidateQueries({ queryKey: ['history'] })
            }
            const context = currentLocation()
            const matches = (
                await Promise.all(
                    (await getFolders())
                        .sort(
                            (a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt))
                        )
                        .map(async (folder) =>
                            (await getTrades(folder.id))
                                .filter(
                                    (trade) =>
                                        trade.location.version === context.version &&
                                        trade.location.type === context.type &&
                                        trade.location.slug === context.slug
                                )
                                .sort((a, b) => a.title.localeCompare(b.title))
                        )
                )
            ).flat()
            const segment = matches[0]?.title || (context.type === 'search' ? recommendTitle() : '')
            title = (segment ? segment + ' - ' : '') + baseTitle
            writeTitle()
        } finally {
            running = false
            if (pending && !stopped) {
                pending = false
                void update().catch(() => {})
            }
        }
    }
    const unsubscribePage = subscribePageUpdates(({ contextChanged }) => {
        if (contextChanged) void update().catch(() => {})
        if (titleTimer !== undefined) return
        titleTimer = setTimeout(() => {
            titleTimer = undefined
            writeTitle()
        }, 100)
    }, 'Title and history updates')
    const unsubscribeCache = client.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.query.queryKey[0] === 'bookmarks')
            void update().catch(() => {})
    })
    const onFocus = () => void update().catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => {
        stopped = true
        clearTimeout(titleTimer)
        unsubscribePage()
        unsubscribeCache()
        window.removeEventListener('focus', onFocus)
    }
}
