// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
    localStorage.clear()
    vi.resetModules()
})

it.each([null, '', 'coloured-meta-tags,focus-item-search'])(
    'enables tab search history for new and existing settings (%j)',
    async (saved) => {
        if (saved !== null) localStorage.setItem('bt-disabled-settings', saved)
        const { useSettingsStore, searchEnhancementIds } = await import('../../src/stores/settings')
        expect(searchEnhancementIds).toContain('search-history')
        expect(useSettingsStore.getState().disabled).not.toContain('search-history')
    }
)

it('persists opting out of tab search history across reloads', async () => {
    const { useSettingsStore } = await import('../../src/stores/settings')
    useSettingsStore.getState().toggle('search-history')
    vi.resetModules()
    const reloaded = await import('../../src/stores/settings')
    expect(reloaded.useSettingsStore.getState().disabled).toContain('search-history')
})
