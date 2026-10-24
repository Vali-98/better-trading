import { applyFilterValue, clearSearch } from '../integrations/poe-trade/search'
import {
    normalizeFilterTitle,
    shortcutChoices,
    shortcutDefinitions,
} from './searchShortcutDefinitions'

function applyShortcut(key: string, value: string, warn: (message: string) => void) {
    const definition = shortcutDefinitions.find(({ keys }) => keys.some((alias) => alias === key))
    const titles = definition ? [normalizeFilterTitle(definition.title), ...definition.keys] : [key]
    const argument = Object.hasOwn(shortcutChoices, value) ? shortcutChoices[value] : value
    return applyFilterValue(titles, definition?.title ?? key, argument, warn)
}

// Consume only completed tokens, leaving unknown or invalid shortcuts available to edit.
export function consumeSearchShortcuts(
    input: HTMLInputElement,
    onWarnings?: (messages: string[]) => void
) {
    const warnings = new Set<string>()
    const original = input.value
    // Reset commands take precedence over filter-setting tokens in the same input.
    if (/(?:^|\s)~?[:;](?:clear|rmrf)(?=\s)/i.test(original)) {
        if (!clearSearch()) {
            onWarnings?.(['The Clear button is unavailable. The shortcut was kept in your search.'])
            return false
        }
        input.value = ''
        onWarnings?.([])
        return true
    }
    const start = input.selectionStart ?? original.length
    const end = input.selectionEnd ?? start
    let removedBeforeStart = 0
    let removedBeforeEnd = 0
    const value = original.replace(
        /(?<!\S)(~?)([a-z][a-z0-9]*)[:;]([^\s]+)(\s+)|(?<!\S)(~?)(il|ilvl)(\d+(?:-\d*)?)(\s+)/gi,
        (
            match,
            prefix,
            key,
            argument,
            _space,
            shortPrefix,
            shortKey,
            shortArgument,
            _shortSpace,
            offset: number
        ) => {
            if (
                !applyShortcut(
                    (key ?? shortKey).toLowerCase(),
                    (argument ?? shortArgument).toLowerCase(),
                    (message) => warnings.add(message)
                )
            )
                return match
            const replacement = prefix ?? shortPrefix
            const removed = match.length - replacement.length
            removedBeforeStart += Math.max(
                0,
                Math.min(removed, start - offset - replacement.length)
            )
            removedBeforeEnd += Math.max(0, Math.min(removed, end - offset - replacement.length))
            return replacement
        }
    )
    onWarnings?.([...warnings])
    if (value === original) return false
    input.value = value === '~' ? '' : value
    input.setSelectionRange(
        Math.min(input.value.length, start - removedBeforeStart),
        Math.min(input.value.length, end - removedBeforeEnd)
    )
    return true
}
