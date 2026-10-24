import { createSearchInputs, placeSearchWarning } from '../integrations/poe-trade/searchInputs'
import { subscribePageUpdates } from './page/updates'
import { reportIntegrationIssue } from '../integrations/diagnostics'
import { decorateMetaTags, restoreMetaTags } from '../integrations/poe-trade/metaTags'
import { startSearchFocusShortcuts } from './searchFocusShortcuts'
import { consumeSearchShortcuts } from './searchShortcuts'
import { useSettingsStore } from '../stores/settings'
import searchEnhancementsCss from '../styles/searchEnhancements.css?inline'

export function startSearchEnhancements() {
    const style = document.createElement('style')
    style.textContent = searchEnhancementsCss
    document.head.append(style)

    const searchInputs = createSearchInputs()
    const rememberInput = searchInputs.remember
    const rememberInputs = searchInputs.refresh
    rememberInputs()
    const onFocus = (event: Event) => {
        if (event.target instanceof HTMLInputElement) rememberInput(event.target)
    }
    document.addEventListener('focus', onFocus, true)
    const stopFocusShortcuts = startSearchFocusShortcuts((statSearch) =>
        searchInputs.find(statSearch ? 'stat' : 'item')
    )

    let scheduled: ReturnType<typeof setTimeout> | undefined
    const process = () => {
        scheduled = undefined
        const { disabled } = useSettingsStore.getState()
        try {
            if (disabled.includes('coloured-meta-tags')) restoreMetaTags()
            else decorateMetaTags()
        } catch {
            reportIntegrationIssue('enhancers', 'Meta tag decoration failed')
        }
    }
    const schedule = () => {
        if (scheduled === undefined) scheduled = setTimeout(process, 0)
    }
    const stopPageUpdates = subscribePageUpdates(({ mutations }) => {
        for (const mutation of mutations) {
            if (
                mutation.type === 'attributes' &&
                mutation.attributeName === 'placeholder' &&
                mutation.target instanceof HTMLInputElement
            )
                rememberInput(mutation.target, mutation.oldValue ?? '')
        }
        rememberInputs()
        schedule()
    }, 'Search decoration updates')
    const warning = document.createElement('div')
    warning.className = 'bt-search-shortcut-warning'
    warning.setAttribute('role', 'status')
    warning.setAttribute('aria-live', 'polite')
    warning.hidden = true
    const showWarnings = (input: HTMLInputElement, messages: string[]) => {
        const text = messages.join(' ')
        if (warning.textContent !== text) warning.textContent = text
        warning.hidden = !text
        if (text) placeSearchWarning(input, warning)
    }
    const onInput = (event: Event) => {
        const input = event.target
        if (!(input instanceof HTMLInputElement)) return
        rememberInput(input)
        const kind = searchInputs.kind(input)
        const setting =
            kind === 'item'
                ? 'default-search-filter-tilde'
                : kind === 'stat'
                  ? 'default-stat-filter-tilde'
                  : undefined
        if (event instanceof InputEvent && event.isComposing) return
        if (
            setting === 'default-search-filter-tilde' &&
            !useSettingsStore.getState().disabled.includes('search-filter-shortcuts') &&
            consumeSearchShortcuts(input, (messages) => showWarnings(input, messages))
        ) {
            event.stopImmediatePropagation()
            input.dispatchEvent(new Event('input', { bubbles: true }))
            return
        }
        if (
            !setting ||
            !input.value ||
            input.value.startsWith(' ') ||
            input.value.startsWith('~') ||
            useSettingsStore.getState().disabled.includes(setting)
        )
            return
        const start = input.selectionStart
        const end = input.selectionEnd
        const direction = input.selectionDirection
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setter?.call(input, `~${input.value}`)
        if (start !== null && end !== null)
            input.setSelectionRange(start + 1, end + 1, direction ?? undefined)
        event.stopImmediatePropagation()
        input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    let suppressEnter = false
    const suppressEnterEvent = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' || !suppressEnter) return
        event.preventDefault()
        event.stopImmediatePropagation()
    }
    const onKeyUp = (event: KeyboardEvent) => {
        suppressEnterEvent(event)
        if (event.key === 'Enter') suppressEnter = false
    }
    const onBlur = () => {
        suppressEnter = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter') return
        if (suppressEnter && event.repeat) {
            suppressEnterEvent(event)
            return
        }
        suppressEnter = false
        if (
            event.isComposing ||
            event.defaultPrevented ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
        )
            return
        const input = event.target
        if (!(input instanceof HTMLInputElement)) return
        rememberInput(input)
        if (
            searchInputs.kind(input) !== 'item' ||
            useSettingsStore.getState().disabled.includes('search-filter-shortcuts')
        )
            return
        if (!consumeSearchShortcuts(input, (messages) => showWarnings(input, messages), true))
            return
        suppressEnter = true
        suppressEnterEvent(event)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keypress', suppressEnterEvent, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onBlur)
    document.addEventListener('input', onInput, true)
    document.addEventListener('compositionend', onInput, true)
    const unsubscribe = useSettingsStore.subscribe(schedule)
    process()
    return () => {
        clearTimeout(scheduled)
        stopPageUpdates()
        stopFocusShortcuts()
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('keypress', suppressEnterEvent, true)
        window.removeEventListener('keyup', onKeyUp, true)
        window.removeEventListener('blur', onBlur)
        document.removeEventListener('focus', onFocus, true)
        document.removeEventListener('input', onInput, true)
        document.removeEventListener('compositionend', onInput, true)
        warning.remove()
        unsubscribe()
        restoreMetaTags()
        style.remove()
    }
}
