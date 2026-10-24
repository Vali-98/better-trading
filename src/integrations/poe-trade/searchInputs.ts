export type SearchInputKind = 'item' | 'stat'

export function createSearchInputs() {
    const kinds = new WeakMap<HTMLInputElement, SearchInputKind>()
    const remember = (input: HTMLInputElement, placeholder = input.placeholder) => {
        if (!input.matches('input.multiselect__input')) return
        if (placeholder === '+ Add Stat Filter') kinds.set(input, 'stat')
        else if (placeholder === 'Search Items...') kinds.set(input, 'item')
    }
    const inputs = () =>
        Array.from(document.querySelectorAll<HTMLInputElement>('input.multiselect__input'))
    const refresh = () => inputs().forEach((input) => remember(input))
    return {
        remember,
        refresh,
        kind: (input: HTMLInputElement) => kinds.get(input),
        find: (kind: SearchInputKind) => {
            refresh()
            return inputs().find(
                (input) =>
                    !input.disabled &&
                    (kinds.get(input) === kind ||
                        (kind === 'item' && Boolean(input.closest('.search-bar .search-left'))))
            )
        },
    }
}

export function itemSearchText() {
    return document.querySelector<HTMLInputElement>('.search-bar .search-left input')?.value ?? ''
}

export function placeSearchWarning(input: HTMLInputElement, warning: HTMLElement) {
    const parent = input.closest('.search-bar') ?? input.parentElement
    if (parent && warning.parentElement !== parent) parent.append(warning)
}
