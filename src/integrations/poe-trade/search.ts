import { currentLocation } from './location'
import { resolveFilter, type FilterId } from './filterDefinitions'
import { parseFilterValue, validFilterValue } from './filterValues'
import type { GameVersion } from '../../models/search'
import { expandFilterGroup } from './expandFilters'
import type { FilterValue, SocketRange } from '../../models/search'
const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function findPropertyFilter(titles: readonly string[]) {
    const filters = Array.from(document.querySelectorAll<HTMLElement>('.filter.filter-property'))
    for (const title of titles) {
        const filter = filters.find(
            (filter) =>
                normalizeTitle(filter.querySelector('.filter-title')?.textContent ?? '') ===
                normalizeTitle(title)
        )
        if (filter) return filter
    }
}
function setNumber(input: HTMLInputElement, value: number | undefined) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        value === undefined ? '' : String(value)
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
}

// Resolve and validate every control before changing the host form.
function prepareFilterUpdate(titles: readonly string[], label: string, value: FilterValue) {
    const filter = findPropertyFilter(titles)
    if (!filter)
        return {
            warning: `${label} is not available on this trade page.`,
        }
    if (filter.classList.contains('disabled'))
        return {
            warning: `${label} is disabled on this trade page.`,
        }
    if (typeof value === 'string') {
        const option = Array.from(
            filter.querySelectorAll<HTMLElement>('.multiselect__option')
        ).find((option) => option.textContent?.trim().toLowerCase() === value)
        if (!option || option.classList.contains('multiselect__option--disabled'))
            return {
                warning: `${label} does not support ${value} on this trade page.`,
            }
        return {
            apply: () => {
                if (!filter.isConnected || !option.isConnected)
                    throw new Error(`${label} filter was replaced before it could be applied.`)
                expandFilterGroup(filter)
                if (!option.classList.contains('multiselect__option--selected')) option.click()
            },
        }
    }
    const min = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="min"]')
    const max = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="max"]')
    if (!min || !max) return { warning: `${label} numeric filter is unavailable.` }
    if (min.matches(':disabled') || max.matches(':disabled') || min.readOnly || max.readOnly)
        return { warning: `${label} numeric filter is disabled.` }
    const range: SocketRange = value ?? {}
    const colors = ['r', 'g', 'b', 'w'] as const
    const colorInputs = colors.map((color) =>
        filter.querySelector<HTMLInputElement>(`input.socket[placeholder="${color.toUpperCase()}"]`)
    )
    if (range.colors && colorInputs.some((input) => !input))
        return {
            warning: `${label} color filters are unavailable on this trade page.`,
        }
    return {
        apply: () => {
            if (!filter.isConnected || !min.isConnected || !max.isConnected)
                throw new Error(`${label} filter was replaced before it could be applied.`)
            expandFilterGroup(filter)
            colorInputs.forEach((input, index) => {
                if (input) setNumber(input, range.colors?.[colors[index]] || undefined)
            })
            setNumber(min, range.min)
            setNumber(max, range.max)
        },
    }
}
export function clearSearch() {
    const button = document.querySelector<HTMLButtonElement>(
        '#trade button.clear-btn, .search-panel button.clear-btn, button.clear-btn'
    )
    if (!button || button.disabled) return false
    button.click()
    return true
}
export async function submitSearch(canSubmit: () => boolean = () => true) {
    await Promise.resolve()
    if (!canSubmit()) return ['The search changed before it could be submitted.']
    const button = document.querySelector<HTMLButtonElement>('button.search-btn')
    if (!button || button.disabled) return ['The Search button is unavailable.']
    button.click()
    return []
}

export interface FilterFailure {
    filter: string
    reason: 'invalid' | 'unavailable' | 'failed' | 'stale'
    message: string
}
export interface ApplyResult {
    ok: boolean
    applied: string[]
    failures: FilterFailure[]
}
export type FilterChanges = Partial<Record<FilterId, FilterValue>>
function applyEntries(
    entries: {
        id: string
        titles: readonly string[]
        label: string
        value: FilterValue
        valid: boolean
        supported?: boolean
    }[]
): ApplyResult {
    const result: ApplyResult = { ok: false, applied: [], failures: [] }
    const expected = location.href
    const prepared = entries.map((entry) => {
        if (entry.supported === false) {
            result.failures.push({
                filter: entry.id,
                reason: 'unavailable',
                message: `${entry.label} is unavailable in this game.`,
            })
            return undefined
        }
        if (!entry.valid) {
            result.failures.push({
                filter: entry.id,
                reason: 'invalid',
                message: `Invalid ${entry.label} value.`,
            })
            return undefined
        }
        const operation = prepareFilterUpdate(entry.titles, entry.label, entry.value)
        if (operation.warning)
            result.failures.push({
                filter: entry.id,
                reason: 'unavailable',
                message: operation.warning,
            })
        return operation.apply
    })
    if (result.failures.length) return result
    for (const [index, apply] of prepared.entries()) {
        const entry = entries[index]
        if (location.href !== expected) {
            result.failures.push({
                filter: entry.id,
                reason: 'stale',
                message: 'The search changed before the filters could be applied.',
            })
            break
        }
        try {
            apply!()
            result.applied.push(entry.id)
        } catch (error) {
            result.failures.push({
                filter: entry.id,
                reason: 'failed',
                message: error instanceof Error ? error.message : `Could not apply ${entry.label}.`,
            })
        }
    }
    result.ok = !result.failures.length
    return result
}

export function applyFilters(
    changes: FilterChanges,
    options: { version?: GameVersion } = {}
): ApplyResult {
    const version = options.version ?? currentLocation().version
    return applyEntries(
        Object.entries(changes)
            .filter((entry) => entry[1] !== undefined)
            .map(([id, value]) => {
                const definition = resolveFilter(id as FilterId, version)
                return {
                    id,
                    label: definition.title,
                    titles: [definition.title, ...(definition.aliases ?? [])],
                    value: value!,
                    valid: validFilterValue(value!, definition),
                    supported: definition.supported,
                }
            })
    )
}
export function applyFilterText(id: FilterId, raw: string): ApplyResult {
    const value = parseFilterValue(raw)
    if (value === undefined)
        return {
            ok: false,
            applied: [],
            failures: [{ filter: id, reason: 'invalid', message: 'Invalid filter value.' }],
        }
    return applyFilters({ [id]: value })
}
export function applyCustomFilter(title: string, raw: string): ApplyResult {
    const value = parseFilterValue(raw)
    return applyEntries([
        {
            id: title,
            titles: [title],
            label: title,
            value: value ?? null,
            valid: value !== undefined && validFilterValue(value),
        },
    ])
}
export async function applyFiltersAndSearch(
    changes: FilterChanges,
    options: { version?: GameVersion } = {}
) {
    const expected = location.href
    const result = applyFilters(changes, options)
    if (!result.ok) return result.failures.map((failure) => failure.message)
    return submitSearch(() => location.href === expected)
}
