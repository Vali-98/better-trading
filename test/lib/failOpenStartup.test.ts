// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { startFeature } from '../../src/lib/startFeature'
afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
})
it('loads preference stores and keeps controls usable when storage is blocked', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Denied')
    })
    const { usePanelStore } = await import('../../src/stores/panel')
    const { useSettingsStore } = await import('../../src/stores/settings')
    expect(usePanelStore.getState().page).toBe('bookmarks')
    usePanelStore.getState().setPage('history')
    usePanelStore.getState().toggleCollapsed()
    usePanelStore.getState().toggleCollapsed()
    expect(usePanelStore.getState().page).toBe('history')
    expect(usePanelStore.getState().collapsed).toBe(false)
    expect(useSettingsStore.getState().disabled).toContain('merged-live-searches')
    useSettingsStore.getState().toggle('search-history')
    expect(useSettingsStore.getState().disabled).toContain('search-history')
})
it('continues startup and cleanup after an independent feature fails', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const healthy = vi.fn()
    const stops = [
        startFeature('Broken', () => {
            throw new Error('Startup')
        }),
        startFeature('Broken cleanup', () => () => {
            throw new Error('Cleanup')
        }),
        startFeature('Healthy', () => healthy),
    ]
    expect(() => stops.forEach((stop) => stop())).not.toThrow()
    expect(healthy).toHaveBeenCalledOnce()
})
