import { getValue, setValue } from '../storage'

export interface Trade {
    id: string
    title: string
    completedAt: string | null
    location: { version: '1' | '2'; type: string; slug: string }
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

export function currentLocation(pathname = location.pathname) {
    const parts = pathname.split('/').slice(1)
    const version = parts[0] === 'trade2' ? '2' : '1'
    const realm = ['xbox', 'sony', 'poe2'].includes(parts[2])
    return {
        version: version as '1' | '2',
        type: parts[1],
        league: realm ? `${parts[2]}/${parts[3]}` : parts[2],
        slug: parts[realm ? 4 : 3],
    }
}
export function tradeUrl(trade: Trade) {
    const { league } = currentLocation()
    return `https://www.pathofexile.com/trade${trade.location.version === '2' ? '2' : ''}/${trade.location.type}/${league}/${trade.location.slug}`
}
