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
