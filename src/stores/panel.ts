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
        localStorage.getItem('bt-current-page') ?? ''
    )
        ? localStorage.getItem('bt-current-page')
        : 'bookmarks') as PanelPage,
    collapsed: Boolean(localStorage.getItem('bt-side-panel-collapsed')),
    setPage: (page) => {
        localStorage.setItem('bt-current-page', page)
        set({ page })
    },
    toggleCollapsed: () =>
        set((state) => {
            if (state.collapsed) localStorage.removeItem('bt-side-panel-collapsed')
            else localStorage.setItem('bt-side-panel-collapsed', 'true')
            return { collapsed: !state.collapsed }
        }),
}))
