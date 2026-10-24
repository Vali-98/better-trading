import { parseLiveSearch } from '../../integrations/poe-trade/live/protocol'
import type { BookmarkLiveSearch, LiveTarget } from '../../models/liveSearch'

interface BookmarkTransport {
    targets: () => Promise<LiveTarget[]>
    open: (url: string) => Promise<number>
    ready: (id: number, scope: string) => Promise<void>
    add: (id: number, search: BookmarkLiveSearch) => Promise<{ ok?: boolean; message?: string }>
    focus: (id: number) => Promise<void>
    delay: () => Promise<void>
}
export function createBookmarkLiveManager(transport: BookmarkTransport) {
    const busy = new Set<number>()
    return async (items: BookmarkLiveSearch[], options: { target?: number; create: boolean }) => {
        if (!items.length || items.length > 500)
            throw new Error('Choose between 1 and 500 trade searches.')
        const searches = [
            ...new Map(
                items.map((item) => {
                    const search = parseLiveSearch(item.url, item.label)
                    return [`${search.scope}/${search.key}`, search] as const
                })
            ).values(),
        ]
        const first = searches[0]
        if (searches.some((search) => search.scope !== first.scope))
            throw new Error('All searches must use the same game, realm and league.')
        const targets = (await transport.targets()).filter((target) => target.scope === first.scope)
        let target =
            options.target === undefined
                ? targets[0]?.id
                : targets.find((tab) => tab.id === options.target)?.id
        if (options.target !== undefined && target === undefined)
            throw new Error('The selected Live Search is no longer available.')
        let added = 0
        if (target === undefined) {
            if (!options.create)
                throw new Error('No compatible Live Search is active. Use Open live search first.')
            target = await transport.open(first.url + '/live')
            await transport.ready(target, first.scope)
            added = 1
        }
        if (busy.has(target))
            throw new Error('This live tab is already adding bookmarks. Wait for it to finish.')
        busy.add(target)
        try {
            for (const search of searches.slice(added)) {
                const response = await transport.add(target, {
                    url: search.url,
                    label: search.label,
                })
                if (!response?.ok) {
                    await transport.focus(target)
                    return {
                        ok: false,
                        added,
                        total: searches.length,
                        message: `${added}/${searches.length} searches added or already present. ${response?.message || 'Connection failed.'} Remaining searches were not added.`,
                    }
                }
                added++
                if (added < searches.length) await transport.delay()
            }
            await transport.focus(target)
            return {
                ok: true,
                added,
                total: searches.length,
                message: `${added} ${added === 1 ? 'search is' : 'searches are'} in the Live Search tab.`,
            }
        } finally {
            busy.delete(target)
        }
    }
}
