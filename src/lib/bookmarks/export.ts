import { getFolders, getTrades, saveFolders, saveTrades, type Folder, type Trade } from './storage'

export function serialize(folder: Folder, trades: Trade[]) {
    const json = JSON.stringify({
        icn: folder.icon,
        tit: folder.title,
        ver: folder.version,
        trs: trades.map((trade) => ({
            tit: trade.title,
            loc: `${trade.location.version}:${trade.location.type}:${trade.location.slug}`,
        })),
    })
    return `3:${btoa(Array.from(new TextEncoder().encode(json), (byte) => String.fromCharCode(byte)).join(''))}`
}

export function deserialize(value: string): {
    folder: Folder
    trades: Trade[]
} {
    const version = value.startsWith('3:') ? 3 : value.startsWith('2:') ? 2 : 1
    const binary = atob(version > 1 ? value.slice(2) : value)
    const data = JSON.parse(
        version > 1
            ? new TextDecoder('utf-8', { fatal: true }).decode(
                  Uint8Array.from(binary, (char) => char.charCodeAt(0))
              )
            : binary
    )
    if (
        typeof data.tit !== 'string' ||
        !Array.isArray(data.trs) ||
        (version === 3 && !['1', '2'].includes(data.ver))
    )
        throw new Error('Invalid folder export')
    const folder: Folder = {
        id: crypto.randomUUID(),
        title: data.tit,
        icon: typeof data.icn === 'string' ? data.icn : null,
        version: version === 3 ? data.ver : '1',
        archivedAt: null,
    }
    const trades: Trade[] = data.trs.map((entry: { tit: string; loc: string }) => {
        if (typeof entry.tit !== 'string' || typeof entry.loc !== 'string')
            throw new Error('Invalid bookmark')
        const parts = entry.loc.split(':')
        if (parts.length === 2 && version < 3) parts.unshift('1')
        const [game, type, slug] = parts
        if (!['1', '2'].includes(game) || !type || !slug || parts.length !== 3)
            throw new Error('Invalid bookmark location')
        return {
            id: crypto.randomUUID(),
            title: entry.tit,
            completedAt: null,
            location: { version: game as '1' | '2', type, slug },
        }
    })
    return { folder, trades }
}

const delimiter = '\n--------------------\n'
export async function backup() {
    const folders = await getFolders()
    const sections: string[][] = [[], []]
    for (const folder of folders)
        sections[folder.archivedAt ? 1 : 0].push(serialize(folder, await getTrades(folder.id)))
    return sections.map((section) => section.join('\n')).join(delimiter)
}
export async function importFolders(text: string, fullBackup = false) {
    const sections = fullBackup ? text.split(delimiter) : [text]
    // Validate every entry before writing anything.
    const entries = sections.flatMap((section, index) =>
        section
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
                const entry = deserialize(line.trim())
                if (index === 1) entry.folder.archivedAt = new Date().toISOString()
                return entry
            })
    )
    if (!entries.length) throw new Error('No folders found')
    for (const entry of entries) await saveTrades(entry.folder.id, entry.trades)
    await saveFolders([...(await getFolders()), ...entries.map((entry) => entry.folder)])
}
