import { browser } from 'wxt/browser'
import { createLiveCoordinator } from './coordinator'
import { createBookmarkLiveManager } from './bookmarks'
import { parseLiveSearch } from '../../integrations/poe-trade/live/protocol'
import type { BookmarkLiveSearch } from '../../models/liveSearch'

export function registerLiveSearchCoordinator() {
    const focus = async (id: number) => {
        const tab = await browser.tabs.update(id, { active: true })
        if (tab?.windowId !== undefined)
            await browser.windows.update(tab.windowId, { focused: true })
    }
    const coordinator = createLiveCoordinator({
        send: (id, message) => browser.tabs.sendMessage(id, message),
        focus,
    })
    const validUrl = (url: unknown): url is string => {
        if (typeof url !== 'string' || url.length > 10_000) return false
        try {
            parseLiveSearch(url)
            return true
        } catch {
            return false
        }
    }
    let lastDiscovery = 0
    let refreshing: Promise<void> | undefined
    const refresh = () => {
        if (refreshing) return refreshing
        refreshing = (async () => {
            let ids = coordinator.ids()
            if (Date.now() - lastDiscovery > 15_000) {
                lastDiscovery = Date.now()
                const open = await browser.tabs.query({})
                ids = [
                    ...new Set([
                        ...ids,
                        ...open.flatMap((tab) => (tab.id === undefined ? [] : [tab.id])),
                    ]),
                ]
            }
            await Promise.all(
                ids.map(async (id) => {
                    try {
                        const response = await browser.tabs.sendMessage(id, {
                            type: 'bt-live-probe',
                        })
                        if (response?.native && validUrl(response.native.url))
                            coordinator.update(id, response.native)
                        else coordinator.remove(id)
                    } catch {
                        coordinator.remove(id)
                    }
                })
            )
        })().finally(() => {
            refreshing = undefined
        })
        return refreshing
    }
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
    const addBookmarks = createBookmarkLiveManager({
        targets: async () => {
            await refresh()
            return coordinator.targets()
        },
        open: async (url) => {
            const tab = await browser.tabs.create({ url, active: true })
            if (tab.id === undefined) throw new Error('Could not open the Live Search tab.')
            return tab.id
        },
        ready: async (id, scope) => {
            const deadline = Date.now() + 45_000
            while (Date.now() < deadline) {
                try {
                    const response = await browser.tabs.sendMessage(id, {
                        type: 'bt-live-activate',
                    })
                    if (response?.native && parseLiveSearch(response.native.url).scope === scope) {
                        coordinator.update(id, response.native)
                        return
                    }
                } catch {
                    /* The new tab may still be loading. */
                }
                await wait(1000)
            }
            throw new Error(
                'The new tab did not connect. Check that you are logged in and Live Search is active, then add the folder again.'
            )
        },
        add: async (id, search) => {
            try {
                return await browser.tabs.sendMessage(id, { type: 'bt-live-add', ...search })
            } catch {
                return { ok: false, message: 'The destination tab is unavailable.' }
            }
        },
        focus,
        delay: () => wait(300),
    })
    browser.tabs.onRemoved.addListener((id) => coordinator.remove(id))
    browser.runtime.onMessage.addListener((input: unknown, sender) => {
        const message = input as {
            query?: string
            url?: string
            label?: string
            native?: { url: string; label?: string }
            target?: number
            items?: BookmarkLiveSearch[]
            create?: boolean
        }
        if (typeof message?.query !== 'string' || !message.query.startsWith('live-search-')) return
        const id = sender.tab?.id
        if (id === undefined || !sender.url || sender.frameId !== 0) return
        try {
            parseLiveSearch(sender.url)
        } catch {
            return
        }
        const failure = (error: unknown) => ({
            ok: false,
            message: error instanceof Error ? error.message : 'Live Search action failed.',
        })
        if (message.query === 'live-search-targets')
            return refresh()
                .then(() => coordinator.targets())
                .catch(() => [])
        if (message.query === 'live-search-bookmarks') {
            if (
                !Array.isArray(message.items) ||
                !message.items.length ||
                message.items.length > 500 ||
                message.items.some(
                    (item) => !item || !validUrl(item.url) || typeof item.label !== 'string'
                ) ||
                (message.target !== undefined && !Number.isInteger(message.target))
            )
                return Promise.resolve({ ok: false, message: 'Invalid bookmark searches.' })
            return addBookmarks(message.items, {
                target: message.target,
                create: message.create === true,
            }).catch(failure)
        }
        if (message.query === 'live-search-status') {
            if (
                message.native &&
                (!validUrl(message.native.url) ||
                    new URL(message.native.url).origin !== new URL(sender.url).origin)
            )
                return
            coordinator.update(id, message.native)
            if (!validUrl(message.url)) return Promise.resolve([])
            const url = message.url
            return refresh()
                .then(() => coordinator.candidates(id, url))
                .catch(() => [])
        }
        if (
            message.query === 'live-search-merge' &&
            validUrl(message.url) &&
            Number.isInteger(message.target)
        )
            return coordinator
                .merge(
                    id,
                    message.target!,
                    message.url,
                    typeof message.label === 'string' ? message.label.slice(0, 100) : ''
                )
                .catch(failure)
    })
}
