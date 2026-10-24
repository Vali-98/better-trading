import { focusStatFilter } from '../integrations/poe-trade/expandFilters'
import { useSettingsStore } from '../stores/settings'

export function startSearchFocusShortcuts(
    findInput: (statSearch: boolean) => HTMLInputElement | undefined
) {
    let suppressFocusKey: string | undefined
    const suppressKey = (event: KeyboardEvent) => {
        if (!suppressFocusKey || event.key.toLowerCase() !== suppressFocusKey) return
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    const onKeyUp = (event: KeyboardEvent) => {
        suppressKey(event)
        if (event.key.toLowerCase() === suppressFocusKey) suppressFocusKey = undefined
    }
    const onWindowBlur = () => {
        suppressFocusKey = undefined
    }
    const onKeyDown = (event: KeyboardEvent) => {
        if (suppressFocusKey && event.repeat && event.key.toLowerCase() === suppressFocusKey) {
            suppressKey(event)
            return
        }
        suppressFocusKey = undefined
        const key = event.key.toLowerCase()
        const statSearch = key === 's'
        const feature = statSearch ? 'focus-stat-search' : 'focus-item-search'
        if (
            !event.shiftKey ||
            !['f', 's'].includes(key) ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.isComposing ||
            event.repeat ||
            event.defaultPrevented ||
            useSettingsStore.getState().disabled.includes(feature)
        )
            return
        const target = event.composedPath()[0]
        if (
            target instanceof HTMLElement &&
            (target.closest('input, textarea, select') || target.isContentEditable)
        )
            return
        const input = findInput(statSearch)
        if (!input) return
        suppressFocusKey = key
        event.preventDefault()
        event.stopImmediatePropagation()
        if (statSearch) focusStatFilter(input)
        else input.focus()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keypress', suppressKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onWindowBlur)

    return () => {
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('keypress', suppressKey, true)
        window.removeEventListener('keyup', onKeyUp, true)
        window.removeEventListener('blur', onWindowBlur)
    }
}
