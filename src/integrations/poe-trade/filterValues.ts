import type { FilterKind, FilterValue, SocketRange } from '../../models/search'

export function parseFilterValue(raw: string): FilterValue | undefined {
    if (['yes', 'no', 'any'].includes(raw)) return raw as 'yes' | 'no' | 'any'
    if (/^(?:\d+[rgbw])+$/.test(raw)) {
        const colors: NonNullable<SocketRange['colors']> = {}
        for (const match of raw.matchAll(/(\d+)([rgbw])/g)) {
            const key = match[2] as keyof typeof colors
            colors[key] = (colors[key] ?? 0) + Number(match[1])
        }
        return { colors }
    }
    const range = /^(\d+(?:\.\d+)?)?(?:-(\d+(?:\.\d+)?)?)?$/.exec(raw)
    if (!range || (!range[1] && !range[2])) return undefined
    return {
        min: range[1] === undefined ? undefined : Number(range[1]),
        max: range[2] === undefined ? undefined : Number(range[2]),
    }
}
export function validFilterValue(
    value: FilterValue,
    definition?: { kind: FilterKind; integer?: boolean; maximum?: number; colors?: boolean }
) {
    if (value === null) return definition?.kind !== 'choice'
    if (typeof value === 'string')
        return ['yes', 'no', 'any'].includes(value) && (!definition || definition.kind === 'choice')
    if (definition?.kind === 'choice') return false
    const range: SocketRange = value
    const counts = Object.values(range.colors ?? {})
    if (range.colors && (!counts.length || (definition && !definition.colors))) return false
    if (
        range.colors &&
        Object.keys(range.colors).some((key) => !['r', 'g', 'b', 'w'].includes(key))
    )
        return false
    const values = [range.min, range.max, ...counts].filter((value) => value !== undefined)
    if (
        values.some(
            (value) =>
                !Number.isFinite(value) ||
                value! < 0 ||
                ((definition?.integer || range.colors) && !Number.isInteger(value))
        )
    )
        return false
    if (range.min !== undefined && range.max !== undefined && range.min > range.max) return false
    if (
        definition?.maximum !== undefined &&
        (values.some((value) => value! > definition.maximum!) ||
            counts.reduce((sum, value) => sum + value, 0) > definition.maximum)
    )
        return false
    return true
}
