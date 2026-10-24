import { reportIntegrationIssue } from '../../diagnostics'

interface ListingRequest<T> {
    url: string | URL
    context: T
}

// Observe matching requests in the page world. Only the socket manager knows
// which token belongs to which search and whether a query needs rewriting.
export function installListingRequests<T>(
    identify: (url: string | URL) => ListingRequest<T> | undefined,
    complete: (context: T, status: number, data?: unknown) => void
) {
    const originalOpen = XMLHttpRequest.prototype.open
    const originalFetch = window.fetch
    const listeners = new AbortController()
    let active = true
    const deliver = (request: ListingRequest<T>, status: number, data?: unknown) => {
        if (!active) return
        try {
            complete(request.context, status, data)
        } catch {
            reportIntegrationIssue('poe-trade', 'Listing observation failed')
        }
    }
    const identifySafely = (url: string | URL) => {
        try {
            return identify(url)
        } catch {
            reportIntegrationIssue('poe-trade', 'Listing request identification failed')
            return undefined
        }
    }
    const open: typeof originalOpen = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...args: unknown[]
    ) {
        if (!active) return Reflect.apply(originalOpen, this, [method, url, ...args])
        const request = identifySafely(url)
        if (request)
            this.addEventListener(
                'loadend',
                () => {
                    let data: unknown
                    try {
                        data =
                            this.responseType === 'json'
                                ? this.response
                                : JSON.parse(this.responseText)
                    } catch {
                        /* Network failures and non-JSON responses have no item payload. */
                    }
                    deliver(request, this.status, data)
                },
                { once: true, signal: listeners.signal }
            )
        return Reflect.apply(originalOpen, this, [method, request?.url ?? url, ...args])
    }
    const fetch: typeof originalFetch = async function (this: Window, ...args) {
        if (!active) return originalFetch.apply(this, args)
        const url = args[0] instanceof Request ? args[0].url : args[0]
        const request = identifySafely(url)
        if (request && String(request.url) !== String(url))
            args[0] = args[0] instanceof Request ? new Request(request.url, args[0]) : request.url
        try {
            const response = await originalFetch.apply(this, args)
            if (request)
                void response
                    .clone()
                    .json()
                    .then(
                        (data) => deliver(request, response.status, data),
                        () => deliver(request, response.status)
                    )
            return response
        } catch (error) {
            if (request) deliver(request, 0)
            throw error
        }
    }
    XMLHttpRequest.prototype.open = open
    window.fetch = fetch
    return () => {
        active = false
        listeners.abort()
        if (XMLHttpRequest.prototype.open === open) XMLHttpRequest.prototype.open = originalOpen
        if (window.fetch === fetch) window.fetch = originalFetch
    }
}
