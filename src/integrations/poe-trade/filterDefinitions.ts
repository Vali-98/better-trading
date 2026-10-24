import type { FilterKind, GameVersion, PerGame } from '../../models/search'
export function forGame<T>(value: PerGame<T>, version: GameVersion): T {
    return value && typeof value === 'object' && 'poe1' in value
        ? (value as { poe1: T; poe2: T })[version === '2' ? 'poe2' : 'poe1']
        : (value as T)
}

export interface FilterDefinition {
    title: PerGame<string>
    kind: FilterKind
    aliases?: readonly string[]
    integer?: boolean
    maximum?: PerGame<number | undefined>
    colors?: PerGame<boolean>
    games?: readonly GameVersion[]
}
export const filterDefinitions = {
    itemLevel: { title: 'Item Level', kind: 'number' },
    quality: {
        title: { poe1: 'Quality', poe2: 'Item Quality' },
        kind: 'number',
    },
    identified: { title: 'Identified', kind: 'choice' },
    vaalGem: { title: 'Vaal Gem', kind: 'choice' },
    corrupted: { title: 'Corrupted', kind: 'choice' },
    gemLevel: { title: 'Gem Level', kind: 'number' },
    fractured: { title: 'Fractured Item', kind: 'choice' },
    synthesis: { title: 'Synthesis Item', kind: 'choice' },
    exarch: { title: 'Searing Exarch', kind: 'choice' },
    eater: { title: 'Eater of Worlds', kind: 'choice' },
    mirrored: { title: 'Mirrored', kind: 'choice' },
    split: { title: 'Split', kind: 'choice' },
    crafted: { title: 'Crafted', kind: 'choice' },
    veiled: { title: 'Veiled', kind: 'choice' },
    vestigial: { title: 'Vestigial', kind: 'choice' },
    memoryStrands: { title: 'Memory Strands', kind: 'number' },
    foulborn: { title: 'Foulborn', kind: 'choice' },
    damage: { title: 'Damage', kind: 'number' },
    attacksPerSecond: { title: 'Attacks per Second', kind: 'number' },
    criticalChance: {
        title: 'Critical Chance',
        aliases: ['Critical Strike Chance'],
        kind: 'number',
    },
    dps: { title: 'Damage per Second', kind: 'number' },
    physicalDps: { title: 'Physical DPS', kind: 'number' },
    elementalDps: { title: 'Elemental DPS', kind: 'number' },
    armour: { title: 'Armour', kind: 'number' },
    evasion: { title: 'Evasion', aliases: ['Evasion Rating'], kind: 'number' },
    energyShield: { title: 'Energy Shield', kind: 'number' },
    ward: { title: 'Ward', kind: 'number' },
    block: { title: 'Block', kind: 'number' },
    basePercentile: {
        title: 'Base Percentile',
        aliases: ['Base Defence Percentile'],
        kind: 'number',
    },
    links: { title: 'Link Groups', kind: 'number', integer: true, maximum: 6, games: ['1'] },
    sockets: {
        title: { poe1: 'Sockets', poe2: 'Augmentable Sockets' },
        kind: 'sockets',
        integer: true,
        maximum: { poe1: 6, poe2: undefined },
        colors: { poe1: true, poe2: false },
    },
} as const satisfies Record<string, FilterDefinition>
export type FilterId = keyof typeof filterDefinitions
export function resolveFilter(id: FilterId, version: GameVersion) {
    const definition: FilterDefinition = filterDefinitions[id]
    return {
        ...definition,
        supported: !definition.games || definition.games.includes(version),
        title: forGame(definition.title, version),
        maximum:
            definition.maximum === undefined ? undefined : forGame(definition.maximum, version),
        colors: definition.colors === undefined ? false : forGame(definition.colors, version),
    }
}

export function supportsFilter(id: FilterId, version: GameVersion) {
    return resolveFilter(id, version).supported
}
