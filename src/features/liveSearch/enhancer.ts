import { createLiveToolbar } from './toolbar'
import { browser } from 'wxt/browser'
import { useSettingsStore } from '../../stores/settings'
import { parseLiveSearch } from '../../integrations/poe-trade/live/protocol'
import type { LiveState } from '../../models/liveSearch'
import {
    activateLiveSearch,
    deactivateLiveSearch,
    applyListingSources,
    clearListingSources,
} from '../../integrations/poe-trade/live/page'
import { itemSearchText } from '../../integrations/poe-trade/searchInputs'
import liveStyles from './liveSearch.css?inline'

// The host controls live in its search toolbar so merging does not depend on the sidebar.
export function startLiveSearchEnhancer() {
    let running = false
    let disposed = false
    let state: LiveState = { subscriptions: [] }
    let candidates: { id: number; label: string }[] = []
    let message = ''
    let busy = false
    let style: HTMLStyleElement | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    let generation = 0
    const pending = new Map<
        string,
        {
            resolve: (result: { ok: boolean; message?: string }) => void
            timer: ReturnType<typeof setTimeout>
        }
    >()
    const labels = new Map<string, Map<string, string>>()
    const command = (action: string, extra: Record<string, unknown> = {}) =>
        window.postMessage({ type: 'bt-live-command', action, ...extra }, location.origin)
    const label = () =>
        itemSearchText().trim().replace(/^~/, '') ||
        document.title.replace(/^\(\d+\) /, '').slice(0, 100)
    const badges = () => applyListingSources(labels)
    const toolbar = createLiveToolbar({
        command,
        onMerge: async (target) => {
            if (busy || !candidates.length) return
            let url: string
            try {
                url = state.native?.url ?? parseLiveSearch(location.href).url
            } catch {
                return
            }
            busy = true
            message = 'Connecting in the destination tab…'
            render()
            try {
                const result = await browser.runtime.sendMessage({
                    query: 'live-search-merge',
                    target,
                    url,
                    label: label(),
                })
                message = result?.ok
                    ? 'Merged. The destination tab now receives this search.'
                    : result?.message || 'Merge failed; the source search was kept running.'
            } catch {
                message = 'Destination unavailable; the source search was kept running.'
            } finally {
                busy = false
                render()
            }
        },
    })
    const render = () => {
        if (running) toolbar.render({ state, candidates, message, busy })
    }
    const heartbeat = async () => {
        if (!running) return
        badges()
        render()
        try {
            const current = parseLiveSearch(location.href)
            const result = await browser.runtime.sendMessage({
                query: 'live-search-status',
                url: current.url,
                native: state.native ? { url: state.native.url, label: label() } : undefined,
            })
            if (!running) return
            candidates = Array.isArray(result) ? result : []
            render()
        } catch {
            candidates = []
            render()
        }
    }
    const receive = (event: MessageEvent) => {
        if (!running || event.source !== window || event.origin !== location.origin) return
        const input = event.data
        if (input?.type === 'bt-live-state' && Array.isArray(input.payload?.subscriptions)) {
            state = input.payload
            render()
            void heartbeat()
        }
        if (input?.type === 'bt-live-reply' && typeof input.payload?.id === 'string') {
            const request = pending.get(input.payload.id)
            if (request) {
                clearTimeout(request.timer)
                pending.delete(input.payload.id)
                request.resolve({ ok: input.payload.ok === true, message: input.payload.message })
            }
        }
        if (
            input?.type === 'bt-live-listings' &&
            Array.isArray(input.payload?.ids) &&
            typeof input.payload.key === 'string' &&
            typeof input.payload.label === 'string'
        ) {
            for (const id of input.payload.ids.slice(0, 100)) {
                if (typeof id !== 'string') continue
                const sources = labels.get(id) ?? new Map<string, string>()
                sources.set(input.payload.key, input.payload.label.slice(0, 100))
                labels.set(id, sources)
            }
            while (labels.size > 500) labels.delete(labels.keys().next().value!)
            badges()
        }
    }
    window.addEventListener('message', receive)
    const runtime = (input: unknown) => {
        const request = input as { type?: string; url?: string; label?: string }
        if (!running) return
        if (request?.type === 'bt-live-activate') {
            if (!state.native) activateLiveSearch()
            return Promise.resolve({
                native: state.native ? { url: state.native.url, label: label() } : undefined,
            })
        }
        if (request?.type === 'bt-live-probe')
            return Promise.resolve({
                native: state.native ? { url: state.native.url, label: label() } : undefined,
            })
        if (request?.type === 'bt-live-add' && typeof request.url === 'string') {
            if (!state.native)
                return Promise.resolve({
                    ok: false,
                    message: 'The destination Live Search is no longer active.',
                })
            const id = crypto.randomUUID()
            return new Promise<{ ok: boolean; message?: string }>((resolve) => {
                const timeout = setTimeout(() => {
                    pending.delete(id)
                    resolve({
                        ok: false,
                        message: 'Destination connection timed out; source remains active.',
                    })
                }, 18_000)
                pending.set(id, { resolve, timer: timeout })
                command('add', { id, url: request.url, label: request.label })
            })
        }
        if (request?.type === 'bt-live-handoff') {
            if (state.subscriptions.length) return Promise.resolve({ ok: false })
            if (state.native?.url === request.url) deactivateLiveSearch()
            return Promise.resolve({ ok: true })
        }
    }
    browser.runtime.onMessage.addListener(runtime)
    const stop = () => {
        generation++
        if (!running) return
        running = false
        window.postMessage({ type: 'bt-live-stop' }, location.origin)
        if (timer) clearInterval(timer)
        toolbar.remove()
        style?.remove()
        style = undefined
        clearListingSources()
        labels.clear()
        state = { subscriptions: [] }
        candidates = []
        message = ''
        busy = false
        for (const request of pending.values()) {
            clearTimeout(request.timer)
            request.resolve({ ok: false, message: 'Merge enhancer disabled.' })
        }
        pending.clear()
        void browser.runtime
            .sendMessage({ query: 'live-search-status', url: location.href })
            .catch(() => {})
    }
    const update = async () => {
        const enabled = !useSettingsStore.getState().disabled.includes('merged-live-searches')
        if (!enabled) {
            stop()
            return
        }
        if (running || disposed) return
        running = true
        const current = ++generation
        style = document.createElement('style')
        style.textContent = liveStyles
        const addStyle = () => {
            if (running && current === generation) {
                ;(document.head ?? document.documentElement).append(style!)
                render()
            }
        }
        if (document.documentElement) addStyle()
        else document.addEventListener('DOMContentLoaded', addStyle, { once: true })
        try {
            await injectScript('/live-search.js')
            if (!running || current !== generation || disposed) {
                window.postMessage({ type: 'bt-live-stop' }, location.origin)
                return
            }
            command('status')
            timer = setInterval(() => void heartbeat(), 3000)
            void heartbeat()
        } catch {
            message = 'Live Search enhancer could not load. Refresh this trade page.'
            render()
        }
    }
    void update()
    const unsubscribe = useSettingsStore.subscribe(() => void update())
    return () => {
        disposed = true
        stop()
        unsubscribe()
        window.removeEventListener('message', receive)
        browser.runtime.onMessage.removeListener(runtime)
    }
}
