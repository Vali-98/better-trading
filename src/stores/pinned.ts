import { create } from 'zustand'
export interface PinnedItem {
    id: string
    pinnedAt: string
    node: HTMLElement
}
export const usePinnedStore = create<{
    pinned: PinnedItem[]
    setPinned: (pinned: PinnedItem[]) => void
}>((set) => ({
    pinned: [],
    setPinned: (pinned) => set({ pinned }),
}))
