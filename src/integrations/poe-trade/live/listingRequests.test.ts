// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installListingRequests } from './listingRequests'
let stop: (() => void) | undefined
afterEach(() => {
    stop?.()
    stop = undefined
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

it('preserves Request headers and credentials when rewriting only its query', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockResolvedValue(new Response('{"result":[]}'))
    vi.stubGlobal('fetch', fetch)
    const complete = vi.fn()
    stop = installListingRequests(
        (value) => ({ url: String(value).replace('query=old', 'query=new'), context: 'source' }),
        complete
    )
    const request = new Request('https://www.pathofexile.com/api/trade/fetch/token?query=old', {
        credentials: 'include',
        headers: { 'X-Test': 'preserved' },
    })
    await window.fetch(request)
    await vi.advanceTimersByTimeAsync(0)
    const forwarded = fetch.mock.calls[0][0] as Request
    expect(forwarded.url).toContain('query=new')
    expect(forwarded.credentials).toBe('include')
    expect(forwarded.headers.get('X-Test')).toBe('preserved')
    expect(request.url).toContain('query=old')
    expect(complete).toHaveBeenCalledWith('source', 200, { result: [] })
})

it('ignores late responses after cleanup and restores the original fetch', async () => {
    vi.useFakeTimers()
    let resolve: (response: Response) => void = () => {}
    const fetch = vi.fn().mockImplementation(
        () =>
            new Promise<Response>((done) => {
                resolve = done
            })
    )
    vi.stubGlobal('fetch', fetch)
    const complete = vi.fn()
    stop = installListingRequests((url) => ({ url, context: 'source' }), complete)
    const pending = window.fetch('https://www.pathofexile.com/api/trade/fetch/token')
    stop()
    resolve(new Response('{"result":[]}'))
    await pending
    await vi.advanceTimersByTimeAsync(0)
    expect(complete).not.toHaveBeenCalled()
    expect(window.fetch).toBe(fetch)
})

it('passes native fetch and XHR through when an observer cannot identify a request', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetch = vi.fn().mockResolvedValue(new Response('{"result":[]}'))
    const open = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetch)
    stop = installListingRequests(() => {
        throw new Error('Schema changed')
    }, vi.fn())
    const url = 'https://www.pathofexile.com/api/trade/fetch/token'
    expect((await window.fetch(url)).status).toBe(200)
    const xhr = new XMLHttpRequest()
    expect(() => xhr.open('GET', url)).not.toThrow()
    expect(open).toHaveBeenCalledWith('GET', url)
    expect(fetch).toHaveBeenCalledWith(url)
    stop()
    open.mockRestore()
    warn.mockRestore()
})

it('preserves the native response when listing observation fails', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetch = vi.fn().mockResolvedValue(new Response('{"result":[]}'))
    vi.stubGlobal('fetch', fetch)
    stop = installListingRequests(
        (url) => ({ url, context: 'source' }),
        () => {
            throw new Error('Enhancer failed')
        }
    )
    const response = await window.fetch('https://www.pathofexile.com/api/trade/fetch/token')
    await vi.advanceTimersByTimeAsync(10)
    expect(await response.json()).toEqual({ result: [] })
    warn.mockRestore()
})
