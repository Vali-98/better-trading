// Runs in the page world so both Firefox and Chrome expose the site's actual requests.
export function installItemCapture() {
    const originalOpen = XMLHttpRequest.prototype.open
    const originalFetch = window.fetch
    let active = true
    const matches = (url: unknown) => {
        try {
            const parsed = new URL(String(url), location.href)
            return (
                parsed.origin === location.origin &&
                /^\/api\/trade2?\/fetch\//.test(parsed.pathname)
            )
        } catch {
            return false
        }
    }
    const publish = (data: unknown) => {
        if (
            !active ||
            !data ||
            typeof data !== 'object' ||
            !('result' in data) ||
            !Array.isArray(data.result)
        )
            return
        const items = data.result.slice(0, 100).flatMap((entry) => {
            const item = entry?.item
            return item
                ? [
                      {
                          id: entry.id,
                          item: {
                              name: item.name ?? '',
                              baseType: item.baseType ?? '',
                              typeLine: item.typeLine ?? '',
                              frameType: item.frameType,
                          },
                      },
                  ]
                : []
        })
        window.postMessage(
            { type: 'bt-result-items', payload: JSON.stringify(items) },
            location.origin
        )
    }
    const open: typeof originalOpen = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...args: unknown[]
    ) {
        if (matches(url))
            this.addEventListener(
                'load',
                () => {
                    try {
                        publish(
                            this.responseType === 'json'
                                ? this.response
                                : JSON.parse(this.responseText)
                        )
                    } catch {
                        /* Non-JSON responses remain untouched. */
                    }
                },
                { once: true }
            )
        return Reflect.apply(originalOpen, this, [method, url, ...args])
    }
    const fetch: typeof originalFetch = async function (this: Window, ...args) {
        const response = await originalFetch.apply(this, args)
        const url = args[0] instanceof Request ? args[0].url : args[0]
        if (matches(url))
            void response
                .clone()
                .json()
                .then(publish)
                .catch(() => {})
        return response
    }
    XMLHttpRequest.prototype.open = open
    window.fetch = fetch
    return () => {
        active = false
        if (XMLHttpRequest.prototype.open === open) XMLHttpRequest.prototype.open = originalOpen
        if (window.fetch === fetch) window.fetch = originalFetch
    }
}
