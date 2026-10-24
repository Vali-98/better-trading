import { installListingRequests } from './listingRequests'
import { decodeLiveMessage, parseLiveSearch, searchFromSocket } from './protocol'
import type { LiveSearch, LiveState, LiveSubscription } from '../../../models/liveSearch'

interface Subscription {
    search: LiveSearch
    status: LiveSubscription['status']
    socket?: WebSocket
    message?: string
    enabled: boolean
    settle?: (ok: boolean, message?: string) => void
}
interface Job {
    token: string
    data: string
    subscription: Subscription
    expires: number
}
export function installLiveBridge() {
    const OriginalSocket = window.WebSocket
    const listeners = new AbortController()
    const subscriptions = new Map<string, Subscription>()
    const timers = new Set<ReturnType<typeof setTimeout>>()
    let native: WebSocket | undefined
    let nativeSearch: LiveSearch | undefined
    let nativeAuthenticated = false
    let resumeGeneration = 0
    let stopped = false
    let current: Job | undefined
    let queue: Job[] = []
    let jobTimer: ReturnType<typeof setTimeout> | undefined
    const post = (type: string, payload: unknown) => {
        if (!stopped) window.postMessage({ type, payload }, location.origin)
    }
    const publish = (message?: string) =>
        post('bt-live-state', {
            native: nativeAuthenticated ? nativeSearch : undefined,
            subscriptions: [...subscriptions.values()].map(
                ({ search, status, message, enabled }) => ({
                    key: search.key,
                    label: search.label,
                    status,
                    enabled,
                    message,
                })
            ),
            message,
        } satisfies LiveState)
    const later = (callback: () => void, ms: number) => {
        const timer = setTimeout(() => {
            timers.delete(timer)
            if (!stopped) callback()
        }, ms)
        timers.add(timer)
        return timer
    }
    const reply = (id: string, ok: boolean, message?: string) =>
        post('bt-live-reply', { id, ok, message })
    const pause = (subscription: Subscription, message?: string) => {
        subscription.socket?.close()
        subscription.socket = undefined
        subscription.status = message ? 'error' : 'paused'
        subscription.message = message
        subscription.settle?.(false, message || 'Subscription paused.')
        queue = queue.filter((job) => job.subscription !== subscription)
        if (current?.subscription === subscription) {
            if (jobTimer) {
                clearTimeout(jobTimer)
                timers.delete(jobTimer)
            }
            current = undefined
            later(drain, 300)
        }
    }
    const suspend = (message: string) => {
        resumeGeneration++
        for (const subscription of subscriptions.values()) pause(subscription, message)
        publish(message)
    }
    const pauseAttached = () => {
        resumeGeneration++
        for (const subscription of subscriptions.values()) pause(subscription)
        queue = []
        current = undefined
        if (jobTimer) {
            clearTimeout(jobTimer)
            timers.delete(jobTimer)
        }
        publish()
    }
    const drain = () => {
        if (current || !nativeAuthenticated || native?.readyState !== OriginalSocket.OPEN) return
        let next = queue.shift()
        while (next && (next.expires < Date.now() || next.subscription.status !== 'active'))
            next = queue.shift()
        if (!next) return
        current = next
        jobTimer = later(() => {
            if (!current) return
            pause(current.subscription, 'Listings could not be loaded. Resume to retry.')
            current = undefined
            publish()
            drain()
        }, 12_000)
        native.dispatchEvent(
            new MessageEvent('message', { data: next.data, origin: location.origin })
        )
    }
    const finish = () => {
        if (jobTimer) {
            clearTimeout(jobTimer)
            timers.delete(jobTimer)
        }
        current = undefined
        later(drain, 300)
    }
    const publishListings = (data: unknown, search: LiveSearch) => {
        if (data && typeof data === 'object' && 'result' in data && Array.isArray(data.result)) {
            const ids = data.result
                .flatMap((entry) => (typeof entry?.id === 'string' ? [entry.id] : []))
                .slice(0, 100)
            post('bt-live-listings', {
                ids,
                key: search.key,
                label: search.label,
            })
        }
    }
    const fetched = (job: Job, status: number, data?: unknown) => {
        if (
            stopped ||
            current !== job ||
            !nativeAuthenticated ||
            job.subscription.status === 'paused'
        )
            return
        if (status === 429)
            suspend('Trade rate limit reached. Added searches paused; resume them later.')
        else if (status < 200 || status >= 300) {
            pause(job.subscription, `Listing fetch failed (HTTP ${status}).`)
            publish()
        }
        publishListings(data, job.subscription.search)
        if (current === job) finish()
    }
    const rewrite = (
        value: string | URL
    ): { url: string | URL; job?: Job; search: LiveSearch } | undefined => {
        const url = new URL(String(value), location.href)
        if (url.origin !== location.origin || !/^\/api\/trade2?\/fetch\//.test(url.pathname))
            return undefined
        if (current && decodeURIComponent(url.pathname.split('/').pop()!) === current.token) {
            url.searchParams.set('query', current.subscription.search.key)
            return { url: url.href, job: current, search: current.subscription.search }
        }
        if (nativeSearch && url.searchParams.get('query') === nativeSearch.key) {
            return {
                url: value,
                search: {
                    ...nativeSearch,
                    label:
                        document.title
                            .replace(/^\(\d+\)\s*/, '')
                            .trim()
                            .slice(0, 100) || nativeSearch.label,
                },
            }
        }
    }
    const complete = (
        request: NonNullable<ReturnType<typeof rewrite>>,
        status: number,
        data?: unknown
    ) => {
        if (stopped) return
        if (request.job) fetched(request.job, status, data)
        else if (status >= 200 && status < 300) publishListings(data, request.search)
    }
    const Socket = new Proxy(OriginalSocket, {
        construct(Target, args) {
            const socket = Reflect.construct(Target, args) as WebSocket
            if (stopped) return socket
            let search: LiveSearch
            try {
                search = searchFromSocket(String(args[0]), document.title)
                if (new URL(search.url).origin !== location.origin) return socket
            } catch {
                return socket
            }
            native = socket
            nativeSearch = search
            nativeAuthenticated = false
            pauseAttached()
            socket.addEventListener(
                'message',
                (event) => {
                    if (native !== socket) return
                    const message = decodeLiveMessage(event.data)
                    if (message?.auth && !nativeAuthenticated) {
                        nativeAuthenticated = true
                        publish()
                        resumeAttached(socket)
                    }
                },
                { signal: listeners.signal }
            )
            socket.addEventListener(
                'close',
                () => {
                    if (native !== socket) return
                    nativeAuthenticated = false
                    pauseAttached()
                },
                { signal: listeners.signal }
            )
            publish()
            return socket
        },
    })
    const connect = (subscription: Subscription, id?: string, settledCallback?: () => void) => {
        if (!nativeAuthenticated || !nativeSearch || native?.readyState !== OriginalSocket.OPEN) {
            subscription.status = 'error'
            subscription.message = 'Activate Live Search in this tab first.'
            if (id) reply(id, false, subscription.message)
            publish()
            return
        }
        if (subscription.search.scope !== nativeSearch.scope) {
            subscription.status = 'error'
            subscription.message = 'Game, realm and league must match.'
            if (id) reply(id, false, subscription.message)
            publish()
            return
        }
        if (subscription.socket && subscription.status === 'active') {
            if (id) reply(id, true)
            settledCallback?.()
            return
        }
        if (subscription.status === 'connecting' && subscription.socket) {
            if (id) reply(id, false, 'This search is already connecting.')
            return
        }
        const socket = new OriginalSocket(subscription.search.socket)
        subscription.socket = socket
        subscription.status = 'connecting'
        subscription.message = undefined
        let settled = false
        const timeout = later(() => {
            if (subscription.socket === socket && !settled) {
                pause(subscription, 'Connection timed out.')
                publish()
            }
        }, 15_000)
        subscription.settle = (ok, message) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            timers.delete(timeout)
            if (id) reply(id, ok, message)
            settledCallback?.()
        }
        socket.addEventListener(
            'message',
            (event) => {
                if (subscription.socket !== socket) return
                const message = decodeLiveMessage(event.data)
                if (message?.auth) {
                    subscription.status = 'active'
                    subscription.settle?.(true)
                    publish()
                }
                if (message?.error) {
                    pause(subscription, 'Live Search server reported an error.')
                    publish()
                    return
                }
                if (!message?.token || subscription.status !== 'active') return
                if (queue.length >= 30) {
                    pause(
                        subscription,
                        'Too many incoming updates. Narrow this search before resuming.'
                    )
                    publish()
                    return
                }
                queue.push({
                    token: message.token,
                    data: event.data,
                    subscription,
                    expires: Date.now() + 15_000,
                })
                drain()
            },
            { signal: listeners.signal }
        )
        socket.addEventListener(
            'close',
            () => {
                if (subscription.socket !== socket) return
                pause(subscription, 'Connection closed. Resume to reconnect.')
                publish()
            },
            { signal: listeners.signal }
        )
        socket.addEventListener(
            'error',
            () => {
                if (subscription.socket !== socket) return
                pause(subscription, 'Connection failed. Resume to reconnect.')
                publish()
            },
            { signal: listeners.signal }
        )
        publish()
    }
    const resumeAttached = (socket: WebSocket) => {
        const generation = ++resumeGeneration
        const waiting = [...subscriptions.values()].filter(
            (subscription) =>
                subscription.enabled && subscription.search.scope === nativeSearch?.scope
        )
        const next = () => {
            if (generation !== resumeGeneration || native !== socket || !nativeAuthenticated) return
            const subscription = waiting.shift()
            if (!subscription) return
            if (!subscription.enabled || !subscriptions.has(subscription.search.key)) {
                next()
                return
            }
            connect(subscription, undefined, () => later(next, 300))
        }
        next()
    }
    window.WebSocket = Socket
    const stopListingRequests = installListingRequests((value) => {
        const request = rewrite(value)
        return request ? { url: request.url, context: request } : undefined
    }, complete)
    const stop = () => {
        resumeGeneration++
        for (const subscription of subscriptions.values()) pause(subscription)
        nativeAuthenticated = false
        subscriptions.clear()
        publish()
        stopped = true
        listeners.abort()
        for (const timer of timers) clearTimeout(timer)
        queue = []
        current = undefined
        if (window.WebSocket === Socket) window.WebSocket = OriginalSocket
        stopListingRequests()
    }
    window.addEventListener(
        'message',
        (event) => {
            if (event.source !== window || event.origin !== location.origin) return
            const input = event.data
            if (input?.type === 'bt-live-stop') {
                stop()
                return
            }
            if (input?.type !== 'bt-live-command') return
            if (input.action === 'status') {
                publish()
                return
            }
            if (
                input.action === 'add' &&
                typeof input.id === 'string' &&
                typeof input.url === 'string' &&
                input.url.length < 10_000
            ) {
                try {
                    const search = parseLiveSearch(
                        input.url,
                        typeof input.label === 'string' ? input.label : ''
                    )
                    if (search.scope !== nativeSearch?.scope)
                        throw new Error('Game, realm and league must match.')
                    if (search.key === nativeSearch?.key && nativeAuthenticated) {
                        reply(input.id, true)
                        return
                    }
                    const existing = subscriptions.get(search.key)
                    if (existing) {
                        // Adding a bookmark or merging must not undo a manual pause.
                        reply(
                            input.id,
                            existing.status !== 'connecting',
                            existing.status === 'connecting'
                                ? 'This search is already connecting.'
                                : undefined
                        )
                        return
                    }
                    const subscription: Subscription = { search, status: 'paused', enabled: true }
                    subscriptions.set(search.key, subscription)
                    connect(subscription, input.id)
                } catch {
                    reply(
                        input.id,
                        false,
                        'Cannot add this search. Check that the destination is live and uses the same game, realm and league.'
                    )
                }
            }
            const subscription = subscriptions.get(input.key)
            if (!subscription) return
            if (input.action === 'pause') {
                subscription.enabled = false
                pause(subscription)
            }
            if (input.action === 'resume') {
                subscription.enabled = true
                if (nativeAuthenticated) connect(subscription)
                else pause(subscription)
            }
            if (input.action === 'remove') {
                pause(subscription)
                subscriptions.delete(input.key)
            }
            publish()
        },
        { signal: listeners.signal }
    )
    later(
        () =>
            publish(
                'Activate Live Search to enable merging. If it was already active, deactivate and reactivate it once.'
            ),
        0
    )
    return stop
}
