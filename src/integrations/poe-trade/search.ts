import { expandFilterGroup } from './expandFilters'
const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function findPropertyFilter(titles: string[]) {
    const filters = Array.from(document.querySelectorAll<HTMLElement>('.filter.filter-property'))
    // Match requested targets in priority order, independent of DOM order.
    for (const title of titles) {
        const filter = filters.find(
            (filter) =>
                normalizeTitle(filter.querySelector('.filter-title')?.textContent ?? '') === title
        )
        if (filter) return filter
    }
}

function setNumber(input: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
}

export function applyFilterValue(
    titles: string[],
    label: string,
    value: string,
    warn: (message: string) => void
) {
    const title = titles[0]
    const filter = findPropertyFilter(titles)
    if (!filter) {
        warn(`${label} is not available on this trade page. The shortcut was kept in your search.`)
        return false
    }
    if (filter.classList.contains('disabled')) {
        warn(`${label} is disabled on this trade page. The shortcut was kept in your search.`)
        return false
    }

    const range = /^(\d+(?:\.\d+)?)?(?:-(\d+(?:\.\d+)?)?)?$/.exec(value)
    const min = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="min"]')
    const max = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="max"]')
    const sockets = title === 'sockets' || title === 'linkgroups'
    const colors = ['r', 'g', 'b', 'w'] as const
    const colorInputs = colors.map((color) =>
        filter.querySelector<HTMLInputElement>(`input.socket[placeholder="${color.toUpperCase()}"]`)
    )
    if (sockets && /^(?:\d+[rgbw])+$/.test(value)) {
        const counts = { r: 0, g: 0, b: 0, w: 0 }
        for (const match of value.matchAll(/(\d+)([rgbw])/g))
            counts[match[2] as keyof typeof counts] += Number(match[1])
        if (Object.values(counts).reduce((sum, count) => sum + count, 0) > 6) return false
        if (colorInputs.some((input) => !input) || !min || !max) {
            warn(
                'Socket color filters are unavailable on this trade page. The shortcut was kept in your search.'
            )
            return false
        }
        expandFilterGroup(filter)
        colorInputs.forEach((input, index) =>
            setNumber(input!, counts[colors[index]] ? String(counts[colors[index]]) : '')
        )
        setNumber(min, '')
        setNumber(max, '')
        return true
    }
    if (range && (range[1] || range[2]) && min && max) {
        if (
            sockets &&
            [range[1], range[2]].some(
                (count) =>
                    count !== undefined && (!Number.isInteger(Number(count)) || Number(count) > 6)
            )
        )
            return false
        if (range[1] && range[2] && Number(range[1]) > Number(range[2])) return false
        expandFilterGroup(filter)
        if (sockets)
            colorInputs.forEach((input) => {
                if (input) setNumber(input, '')
            })
        setNumber(min, range[1] ?? '')
        setNumber(max, range[2] ?? '')
        return true
    }

    const choice = ['yes', 'no', 'any'].includes(value) ? value : undefined
    if (!choice) return false
    const option = Array.from(filter.querySelectorAll<HTMLElement>('.multiselect__option')).find(
        (option) => option.textContent?.trim().toLowerCase() === choice
    )
    if (!option || option.classList.contains('multiselect__option--disabled')) {
        warn(
            `${label} does not support ${choice} on this trade page. The shortcut was kept in your search.`
        )
        return false
    }
    expandFilterGroup(filter)
    if (!option.classList.contains('multiselect__option--selected'))
        // Vue Multiselect binds option selection to click; mousedown only prevents blur.
        option.click()
    return true
}

export function clearSearch() {
    const button = document.querySelector<HTMLButtonElement>(
        '#trade button.clear-btn, .search-panel button.clear-btn, button.clear-btn'
    )
    if (!button || button.disabled) return false
    button.click()
    return true
}

export function clearNumericFilter(titles: string[]) {
    const filter = findPropertyFilter(titles)
    if (!filter || filter.classList.contains('disabled')) return false
    const min = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="min"]')
    const max = filter.querySelector<HTMLInputElement>('input.minmax[placeholder="max"]')
    if (!min || !max) return false
    setNumber(min, '')
    setNumber(max, '')
    return true
}

export async function submitSearch() {
    await Promise.resolve()
    const button = document.querySelector<HTMLButtonElement>('button.search-btn')
    if (!button || button.disabled) return ['The Search button is unavailable.']
    button.click()
    return []
}
