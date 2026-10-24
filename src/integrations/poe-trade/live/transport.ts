import { reportIntegrationIssue } from '../../diagnostics'
import { searchFromSocket } from './protocol'
import type { LiveSearch } from '../../../models/liveSearch'

export function observeNativeSockets(onSocket: (socket: WebSocket, search: LiveSearch) => void) {
    let active = true
    const OriginalSocket = window.WebSocket
    const Socket = new Proxy(OriginalSocket, {
        construct(Target, args) {
            const socket = Reflect.construct(Target, args) as WebSocket
            if (!active) return socket
            let search: LiveSearch
            try {
                search = searchFromSocket(String(args[0]), document.title)
                if (new URL(search.url).origin !== location.origin) return socket
            } catch {
                return socket
            }
            try {
                onSocket(socket, search)
            } catch {
                reportIntegrationIssue('poe-trade', 'Native socket observation failed')
            }
            return socket
        },
    })
    window.WebSocket = Socket
    return () => {
        active = false
        if (window.WebSocket === Socket) window.WebSocket = OriginalSocket
    }
}

export function routeListingRequest(
    value: string | URL,
    added: { token: string; search: LiveSearch } | undefined,
    nativeSearch: LiveSearch | undefined
) {
    const url = new URL(String(value), location.href)
    if (url.origin !== location.origin || !/^\/api\/trade2?\/fetch\//.test(url.pathname)) return
    if (added && decodeURIComponent(url.pathname.split('/').pop()!) === added.token) {
        url.searchParams.set('query', added.search.key)
        return { url: url.href, added: true, search: added.search }
    }
    if (nativeSearch && url.searchParams.get('query') === nativeSearch.key)
        return {
            url: value,
            added: false,
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
