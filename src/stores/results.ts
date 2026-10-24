import type { ResultEntry, ResultItem } from '../models/item'
import { create } from 'zustand'

export const useResultsStore = create<{
    items: Map<string, ResultItem>
    receive: (payload: ResultEntry[]) => void
}>((set) => ({
    items: new Map(),
    receive: (payload) => {
        set((state) => {
            const items = new Map(state.items)
            for (const entry of payload) {
                items.delete(entry.id)
                items.set(entry.id, entry.item)
            }
            while (items.size > 2000) items.delete(items.keys().next().value!)
            return { items }
        })
    },
}))
