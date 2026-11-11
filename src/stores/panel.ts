import { preferences } from '../lib/preferences'
import { create } from 'zustand'

export type PanelPage = 'bookmarks' | 'history' | 'pinned-items'
interface PanelState {
    page: PanelPage
    collapsed: boolean
    setPage: (page: PanelPage) => void
    toggleCollapsed: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
    page: (['bookmarks', 'history', 'pinned-items'].includes(
        preferences.getItem('bt-current-page') ?? ''
    )
        ? preferences.getItem('bt-current-page')
        : 'bookmarks') as PanelPage,
    collapsed: Boolean(preferences.getItem('bt-side-panel-collapsed')),
    setPage: (page) => {
        preferences.setItem('bt-current-page', page)
        set({ page })
    },
    toggleCollapsed: () =>
        set((state) => {
            if (state.collapsed) preferences.removeItem('bt-side-panel-collapsed')
            else preferences.setItem('bt-side-panel-collapsed', 'true')
            return { collapsed: !state.collapsed }
        }),
}))
