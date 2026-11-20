import { browser } from 'wxt/browser'
import { getValue, setValue } from '../storage'

export interface Trade {
    id: string
    title: string
    completedAt: string | null
    location: { version: '1' | '2'; type: string; slug: string }
    lastObservedPrice?: { amount: number; currency: string; icon?: string }
}
export interface Folder {
    id: string
    title: string
    version: '1' | '2'
    icon: string | null
    archivedAt: string | null
}
export async function getFolders(): Promise<Folder[]> {
    return ((await getValue<Folder[]>('bookmark-folders')) ?? []).map((folder) => ({
        ...folder,
        version: folder.version ?? '1',
        archivedAt: folder.archivedAt ?? null,
    }))
}
export async function getTrades(id: string): Promise<Trade[]> {
    return ((await getValue<Trade[]>(`bookmark-trades--${id}`)) ?? []).map((trade) => ({
        ...trade,
        location: { ...trade.location, version: trade.location.version ?? '1' },
    }))
}
export const saveFolders = (folders: Folder[]) => setValue('bookmark-folders', folders)
export const saveTrades = (id: string, trades: Trade[]) =>
    setValue(`bookmark-trades--${id}`, trades)

// Find the folder holding the trade and overwrite its last observed price.
export async function recordTradePrice(
    tradeId: string,
    price: NonNullable<Trade['lastObservedPrice']>
): Promise<string | null> {
    for (const folder of await getFolders()) {
        const trades = await getTrades(folder.id)
        const index = trades.findIndex((trade) => trade.id === tradeId)
        if (index < 0) continue
        trades[index] = { ...trades[index], lastObservedPrice: price }
        await saveTrades(folder.id, trades)
        return folder.id
    }
    return null
}

// Remove the visible folder first. A failed content cleanup leaves recoverable,
// unreachable data rather than an existing folder with its trades erased.
export async function removeFolder(id: string) {
    await saveFolders((await getFolders()).filter((folder) => folder.id !== id))
    try {
        await browser.storage.local.remove(`bookmark-trades--${id}`)
    } catch {
        // The folder is removed; its orphaned trades may be cleaned up later.
    }
}
