// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installItemCapture } from './capture'

let stop: (() => void) | undefined
afterEach(() => {
    stop?.()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})
const result = [
    {
        id: 'item-one',
        item: {
            name: 'Mageblood',
            baseType: 'Heavy Belt',
            typeLine: 'Heavy Belt',
            frameType: 3,
            secret: 'omit',
        },
        listing: { account: 'omit' },
    },
]

it('observes XHR item responses without changing them and restores the hook', () => {
    const originalOpen = XMLHttpRequest.prototype.open
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    stop = installItemCapture()
    const xhr = new XMLHttpRequest()
    xhr.open('GET', '/api/trade/fetch/item-one')
    Object.defineProperty(xhr, 'responseText', { value: JSON.stringify({ result }) })
    xhr.dispatchEvent(new Event('load'))
    const message = post.mock.calls[0][0]
    expect(message.type).toBe('bt-result-items')
    expect(JSON.parse(message.payload)[0].item.name).toBe('Mageblood')
    expect(message.payload).not.toContain('omit')
    stop()
    expect(XMLHttpRequest.prototype.open).toBe(originalOpen)
})

it('observes fetch clones, ignores unrelated URLs, and returns the original response', async () => {
    const response = { clone: vi.fn(() => ({ json: async () => ({ result }) })) }
    const fetch = vi.fn(async () => response)
    vi.stubGlobal('fetch', fetch)
    const post = vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    stop = installItemCapture()
    expect(await window.fetch('/api/trade2/fetch/item-one')).toBe(response)
    await Promise.resolve()
    expect(post).toHaveBeenCalledTimes(1)
    await window.fetch('/api/trade/search/Standard')
    await window.fetch('https://example.com/api/trade/fetch/item-one')
    expect(response.clone).toHaveBeenCalledTimes(1)
    stop()
    expect(window.fetch).toBe(fetch)
})
