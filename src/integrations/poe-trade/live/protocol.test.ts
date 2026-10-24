import { expect, it } from 'vitest'
import { decodeLiveMessage, parseLiveSearch, searchFromSocket } from './protocol'
it('normalizes trade1/2 and console routes without losing realm or encoded league', () => {
    const url = 'https://www.pathofexile.com/trade2/search/poe2/Forbidden%20Rites/encoded/live'
    expect(parseLiveSearch(url).socket).toBe(
        'wss://www.pathofexile.com/api/trade2/live/poe2/Forbidden%20Rites/encoded'
    )
    expect(searchFromSocket(parseLiveSearch(url).socket, 'Gem').label).toBe('Gem')
    expect(
        parseLiveSearch('https://www.pathofexile.com/trade/search/xbox/League/query').scope
    ).toBe('https://www.pathofexile.com/trade/xbox/League')
})
it('rejects unrelated origins, credentials and malformed routes', () => {
    for (const url of [
        'https://example.com/trade/search/League/query',
        'http://www.pathofexile.com/trade/search/League/query',
        'https://user@www.pathofexile.com/trade/search/League/query',
        'https://www.pathofexile.com/account',
        'https://www.pathofexile.com/trade/search/League/query/extra',
    ])
        expect(() => parseLiveSearch(url)).toThrow()
})
it('accepts authenticated messages and opaque result tokens without decoding or logging them', () => {
    expect(decodeLiveMessage('{"auth":true}')?.auth).toBe(true)
    expect(decodeLiveMessage('{"result":"signed.token"}')?.token).toBe('signed.token')
    expect(decodeLiveMessage('{"result":"bad/token"}')?.token).toBeUndefined()
    expect(decodeLiveMessage('invalid')).toBeUndefined()
})
