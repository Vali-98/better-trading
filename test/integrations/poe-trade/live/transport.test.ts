// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { observeNativeSockets } from '../../../../src/integrations/poe-trade/live/transport'
afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})
it('makes retained socket wrappers inert after cleanup without removing another wrapper', () => {
    vi.stubGlobal('location', new URL('https://www.pathofexile.com/trade/search/League/query'))
    class Socket extends EventTarget {
        constructor(public url: string) {
            super()
        }
    }
    vi.stubGlobal('WebSocket', Socket)
    const receive = vi.fn()
    const stop = observeNativeSockets(receive)
    const retained = window.WebSocket
    const otherWrapper = new Proxy(retained, {})
    window.WebSocket = otherWrapper
    stop()
    expect(window.WebSocket).toBe(otherWrapper)
    new window.WebSocket('wss://www.pathofexile.com/api/trade/live/League/query')
    expect(receive).not.toHaveBeenCalled()
})
it('does not break host socket construction when observation throws', () => {
    vi.stubGlobal('location', new URL('https://www.pathofexile.com/trade/search/League/query'))
    class Socket extends EventTarget {
        constructor(public url: string) {
            super()
        }
    }
    vi.stubGlobal('WebSocket', Socket)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stop = observeNativeSockets(() => {
        throw new Error('Observer failed')
    })
    expect(
        new window.WebSocket('wss://www.pathofexile.com/api/trade/live/League/query')
    ).toBeInstanceOf(Socket)
    stop()
})
