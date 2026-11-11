// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../../src/lib/bookmarks/storage', () => ({ getFolders: vi.fn(), getTrades: vi.fn() }))
vi.mock('../../src/lib/history', () => ({ recordCurrentSearch: vi.fn() }))
import { getFolders, getTrades } from '../../src/lib/bookmarks/storage'
import { recordCurrentSearch } from '../../src/lib/history'
import { startPageController } from '../../src/lib/pageController'
afterEach(() => vi.restoreAllMocks())
it('uses healthy bookmark titles when history and another folder fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    window.history.replaceState({}, '', '/trade/search/Standard/abc')
    document.title = 'Trade'
    vi.mocked(recordCurrentSearch).mockRejectedValue(new Error('Storage unavailable'))
    vi.mocked(getFolders).mockResolvedValue([
        { id: 'bad', title: 'Bad', version: '1', icon: null, archivedAt: null },
        { id: 'good', title: 'Good', version: '1', icon: null, archivedAt: null },
    ])
    vi.mocked(getTrades).mockImplementation(async (id) => {
        if (id === 'bad') throw new Error('Malformed folder')
        return [
            {
                id: 'trade',
                title: 'Healthy search',
                completedAt: null,
                location: { version: '1', type: 'search', slug: 'abc' },
            },
        ]
    })
    const client = new QueryClient()
    const stop = startPageController(client)
    try {
        await vi.waitFor(() => expect(document.title).toBe('Healthy search - Trade'))
    } finally {
        stop()
        client.clear()
    }
})
