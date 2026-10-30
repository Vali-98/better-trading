import { parseLiveSearch } from '../../integrations/poe-trade/live/protocol'
import type { LiveSearch } from '../../models/liveSearch'

interface TabInfo {
    id: number
    search: LiveSearch
    subscriptions: string[]
    updated: number
}
interface Transport {
    send: (id: number, message: unknown) => Promise<unknown>
    focus: (id: number) => Promise<void>
}
// The background owns discovery and handoff; subscriptions stay in the destination page.
export function createLiveCoordinator(transport: Transport) {
    const tabs = new Map<number, TabInfo>()
    const merging = new Set<number>()
    return {
        ids: () => [...tabs.keys()],
        remove(id: number) {
            tabs.delete(id)
        },
        update(id: number, value?: { url: string; label?: string; subscriptions?: string[] }) {
            if (!value) {
                tabs.delete(id)
                return
            }
            const search = parseLiveSearch(value.url, value.label)
            tabs.set(id, {
                id,
                search,
                subscriptions: value.subscriptions ?? [],
                updated: Date.now(),
            })
        },
        targets() {
            return [...tabs.values()]
                .filter((tab) => Date.now() - tab.updated <= 20_000)
                .map((tab) => ({ id: tab.id, label: tab.search.label, scope: tab.search.scope }))
        },
        candidates(id: number, url: string) {
            const current = parseLiveSearch(url)
            for (const [key, tab] of tabs) if (Date.now() - tab.updated > 20_000) tabs.delete(key)
            return [...tabs.values()]
                .filter((tab) => tab.id !== id && tab.search.scope === current.scope)
                .map((tab) => ({
                    id: tab.id,
                    label: tab.search.label,
                    ...(tab.search.key === current.key || tab.subscriptions.includes(current.key)
                        ? { contains: true }
                        : {}),
                }))
        },
        async merge(sourceId: number, targetId: number, url: string, label: string) {
            if (sourceId === targetId || merging.has(sourceId))
                throw new Error('A merge is already in progress.')
            const search = parseLiveSearch(url, label)
            const target = tabs.get(targetId)
            if (
                !target ||
                Date.now() - target.updated > 20_000 ||
                target.search.scope !== search.scope
            )
                throw new Error('The destination Live Search is no longer available.')
            merging.add(sourceId)
            try {
                const response = (await transport.send(targetId, {
                    type: 'bt-live-add',
                    url: search.url,
                    label: search.label,
                })) as { ok?: boolean; message?: string; existing?: boolean } | undefined
                if (!response?.ok)
                    throw new Error(response?.message || 'The destination could not connect.')
                // Never stop the source until the destination confirms authentication.
                if (!response.existing)
                    await transport.send(sourceId, { type: 'bt-live-handoff', url: search.url })
                await transport.focus(targetId)
                return { ok: true, existing: response.existing === true }
            } finally {
                merging.delete(sourceId)
            }
        },
    }
}
