// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installLiveSession as installLiveBridge } from './session'

let stop: (() => void) | undefined
afterEach(() => {
    stop?.()
    stop = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})
function setup(status = 200) {
    vi.useFakeTimers()
    vi.stubGlobal(
        'location',
        new URL('https://www.pathofexile.com/trade/search/League/native/live')
    )
    class Socket extends EventTarget {
        static OPEN = 1
        static CLOSED = 3
        static instances: Socket[] = []
        readyState = 1
        constructor(public url: string) {
            super()
            Socket.instances.push(this)
        }
        close() {
            this.readyState = 3
        }
    }
    vi.stubGlobal('WebSocket', Socket)
    const fetch = vi
        .fn()
        .mockImplementation(
            async () => new Response(JSON.stringify({ result: [{ id: 'item' }] }), { status })
        )
    vi.stubGlobal('fetch', fetch)
    stop = installLiveBridge()
    const native = new window.WebSocket('wss://www.pathofexile.com/api/trade/live/League/native')
    native.dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    const command = (extra: Record<string, unknown>) =>
        window.dispatchEvent(
            new MessageEvent('message', {
                source: window,
                origin: location.origin,
                data: { type: 'bt-live-command', ...extra },
            })
        )
    command({
        action: 'add',
        id: 'request',
        url: 'https://www.pathofexile.com/trade/search/League/secondary',
        label: 'Second',
    })
    const secondary = Socket.instances[1]
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    return { Socket, native, secondary, fetch, command }
}
it('routes secondary tokens through the native fetch handler, queues updates, and restores hooks', async () => {
    const { Socket, native, secondary, fetch } = setup()
    native.addEventListener('message', (event) => {
        const token = JSON.parse(event.data).result
        if (token) void window.fetch(`/api/trade/fetch/${token}?query=native`)
    })
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"result":"first.token"}' }))
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"result":"second.token"}' }))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(
        'https://www.pathofexile.com/api/trade/fetch/first.token?query=secondary'
    )
    await vi.advanceTimersByTimeAsync(350)
    expect(fetch).toHaveBeenCalledTimes(2)
    await window.fetch('/api/trade/fetch/unrelated?query=native')
    expect(fetch.mock.calls[2][0]).toBe('/api/trade/fetch/unrelated?query=native')
    stop!()
    expect(secondary.readyState).toBe(Socket.CLOSED)
    expect(native.readyState).toBe(Socket.OPEN)
    expect(window.WebSocket).toBe(Socket)
    expect(window.fetch).toBe(fetch)
})
it('rewrites native XHR listing fetches and preserves unrelated requests', () => {
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {})
    const { native, secondary } = setup()
    native.addEventListener('message', (event) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', `/api/trade/fetch/${JSON.parse(event.data).result}?query=native`)
    })
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"result":"xhr.token"}' }))
    expect(open).toHaveBeenCalledWith(
        'GET',
        'https://www.pathofexile.com/api/trade/fetch/xhr.token?query=secondary'
    )
})
it('pauses added subscriptions on HTTP 429 instead of reconnecting', async () => {
    const { native, secondary, fetch, Socket } = setup(429)
    native.addEventListener('message', (event) => {
        void window.fetch(`/api/trade/fetch/${JSON.parse(event.data).result}?query=native`)
    })
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"result":"limited.token"}' }))
    await vi.advanceTimersByTimeAsync(500)
    expect(secondary.readyState).toBe(Socket.CLOSED)
    expect(native.readyState).toBe(Socket.OPEN)
    expect(fetch).toHaveBeenCalledTimes(1)
})

it('stops attached searches cleanly with the main socket and restores only enabled searches after authentication', async () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const { native, secondary, command, Socket } = setup()
    command({
        action: 'add',
        id: 'third',
        url: 'https://www.pathofexile.com/trade/search/League/third',
        label: 'Third',
    })
    const third = Socket.instances[2]
    third.dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    command({ action: 'pause', key: 'secondary' })
    native.close()
    native.dispatchEvent(new Event('close'))
    const latest = () =>
        post.mock.calls.filter(([value]) => value.type === 'bt-live-state').at(-1)![0].payload
    expect(third.readyState).toBe(Socket.CLOSED)
    expect(secondary.readyState).toBe(Socket.CLOSED)
    expect(latest().subscriptions).toEqual([
        expect.objectContaining({
            key: 'secondary',
            status: 'paused',
            enabled: false,
            message: undefined,
        }),
        expect.objectContaining({
            key: 'third',
            status: 'paused',
            enabled: true,
            message: undefined,
        }),
    ])
    const restarted = new window.WebSocket('wss://www.pathofexile.com/api/trade/live/League/native')
    expect(Socket.instances).toHaveLength(4)
    restarted.dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    expect(Socket.instances).toHaveLength(5)
    expect(Socket.instances[4].url).toContain('/third')
    Socket.instances[4].dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    await vi.advanceTimersByTimeAsync(350)
    expect(Socket.instances).toHaveLength(5)
    expect(latest().subscriptions).toEqual([
        expect.objectContaining({ key: 'secondary', status: 'paused', enabled: false }),
        expect.objectContaining({ key: 'third', status: 'active', enabled: true }),
    ])
})

it('preserves a manual pause during an in-flight update instead of reporting a timeout error', async () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const { secondary, command } = setup()
    secondary.dispatchEvent(new MessageEvent('message', { data: '{"result":"pending.token"}' }))
    command({ action: 'pause', key: 'secondary' })
    await vi.advanceTimersByTimeAsync(13_000)
    const state = post.mock.calls.filter(([value]) => value.type === 'bt-live-state').at(-1)![0]
        .payload
    expect(state.subscriptions[0]).toMatchObject({
        status: 'paused',
        enabled: false,
        message: undefined,
    })
})

it('reconnects attached searches one at a time after the main search restarts', async () => {
    const { native, command, Socket } = setup()
    command({
        action: 'add',
        id: 'third',
        url: 'https://www.pathofexile.com/trade/search/League/third',
        label: 'Third',
    })
    Socket.instances[2].dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    native.close()
    native.dispatchEvent(new Event('close'))
    const restarted = new window.WebSocket('wss://www.pathofexile.com/api/trade/live/League/native')
    restarted.dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    expect(Socket.instances).toHaveLength(5)
    await vi.advanceTimersByTimeAsync(500)
    expect(Socket.instances).toHaveLength(5)
    Socket.instances[4].dispatchEvent(new MessageEvent('message', { data: '{"auth":true}' }))
    await vi.advanceTimersByTimeAsync(350)
    expect(Socket.instances).toHaveLength(6)
    expect(Socket.instances[5].url).toContain('/third')
})

it('does not re-add the primary query or an existing attached query, including a manually paused one', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const { command, Socket } = setup()
    command({
        action: 'add',
        id: 'primary-again',
        url: 'https://www.pathofexile.com/trade/search/League/native',
        label: 'Primary',
    })
    command({
        action: 'add',
        id: 'active-again',
        url: 'https://www.pathofexile.com/trade/search/League/secondary',
        label: 'Second',
    })
    expect(Socket.instances).toHaveLength(2)
    command({ action: 'pause', key: 'secondary' })
    command({
        action: 'add',
        id: 'paused-again',
        url: 'https://www.pathofexile.com/trade/search/League/secondary',
        label: 'Second',
    })
    expect(Socket.instances).toHaveLength(2)
    expect(
        post.mock.calls.some(
            ([value]) =>
                value.type === 'bt-live-reply' &&
                value.payload.id === 'paused-again' &&
                value.payload.ok === false
        )
    ).toBe(true)
    const state = post.mock.calls.filter(([value]) => value.type === 'bt-live-state').at(-1)![0]
        .payload
    expect(state.subscriptions[0]).toMatchObject({ status: 'paused', enabled: false })
    for (const id of ['primary-again', 'active-again']) {
        expect(
            post.mock.calls.some(
                ([value]) =>
                    value.type === 'bt-live-reply' && value.payload.id === id && value.payload.ok
            )
        ).toBe(true)
    }
})

it('labels main-search fetch results without rewriting their requests', async () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const { fetch } = setup()
    document.title = '(3) Main search'
    const url = '/api/trade/fetch/main.token?query=native'
    await window.fetch(url)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledWith(url)
    expect(
        post.mock.calls.some(
            ([value]) =>
                value.type === 'bt-live-listings' &&
                value.payload.key === 'native' &&
                value.payload.label === 'Main search' &&
                value.payload.ids.includes('item')
        )
    ).toBe(true)
    document.title = ''
})

it('labels main-search XHR results while leaving their query unchanged', () => {
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {})
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    setup()
    const xhr = new XMLHttpRequest()
    xhr.open('GET', '/api/trade/fetch/main.token?query=native')
    Object.defineProperty(xhr, 'status', { value: 200 })
    Object.defineProperty(xhr, 'responseText', {
        value: JSON.stringify({ result: [{ id: 'main-item' }] }),
    })
    xhr.dispatchEvent(new Event('loadend'))
    expect(open).toHaveBeenCalledWith('GET', '/api/trade/fetch/main.token?query=native')
    expect(
        post.mock.calls.some(
            ([value]) =>
                value.type === 'bt-live-listings' &&
                value.payload.key === 'native' &&
                value.payload.ids.includes('main-item')
        )
    ).toBe(true)
})

it('rejects a duplicate failed subscription so the coordinator cannot hand off its working source', () => {
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    const { secondary, command, Socket } = setup()
    secondary.dispatchEvent(new Event('error'))
    command({
        action: 'add',
        id: 'failed-again',
        url: 'https://www.pathofexile.com/trade/search/League/secondary',
    })
    expect(Socket.instances).toHaveLength(2)
    expect(
        post.mock.calls.some(
            ([value]) =>
                value.type === 'bt-live-reply' &&
                value.payload.id === 'failed-again' &&
                value.payload.ok === false
        )
    ).toBe(true)
})
