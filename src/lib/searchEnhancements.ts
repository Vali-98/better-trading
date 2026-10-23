import { useSettingsStore } from '../stores/settings'
import searchEnhancementsCss from '../styles/searchEnhancements.css?inline'

const anyMetaTagPattern = /^\(([^)]+)\)(?=\s|$)/
const metaTagThemes: Record<string, string> = {
    pseudo: 'pseudo',
    psuedo: 'pseudo',
    explicit: 'explicit',
    implicit: 'implicit',
    enchant: 'enchant',
    imbued: 'enchant',
    fractured: 'fractured',
    scourge: 'red',
    mercenary: 'mercenary',
    delve: 'delve',
    sanctum: 'sanctum',
    crucible: 'red',
}
const editedStatFilterInputs = new WeakSet<HTMLInputElement>()
const statFilterInputSelector = 'input.multiselect__input[placeholder="+ Add Stat Filter"]'

function decorateMetaTag(option: HTMLElement) {
    option.querySelectorAll<HTMLElement>('[data-bt-meta-tag-label]').forEach((tag) => {
        delete tag.dataset.btMetaTagLabel
        delete tag.dataset.btMetaStat
        delete tag.dataset.btMetaTagTheme
    })
    const text = Array.from(option.querySelectorAll<HTMLElement>('span')).find((span) => {
        if (span.children.length) return false
        const tag = (span.textContent ?? '').match(anyMetaTagPattern)?.[1].toLowerCase()
        return Boolean(tag && metaTagThemes[tag])
    })
    if (!text) return
    const match = (text.textContent ?? '').match(anyMetaTagPattern)
    if (!match) return
    const tag = match[1].toLowerCase()
    const theme = metaTagThemes[tag]
    if (!theme) return
    text.dataset.btMetaTagLabel = tag === 'psuedo' ? 'Pseudo' : tag
    text.dataset.btMetaStat = (text.textContent ?? '').slice(match[0].length).trimStart()
    text.dataset.btMetaTagTheme = theme
}

function restoreMetaTags() {
    document.querySelectorAll<HTMLElement>('[data-bt-meta-tag-label]').forEach((tag) => {
        delete tag.dataset.btMetaTagLabel
        delete tag.dataset.btMetaStat
        delete tag.dataset.btMetaTagTheme
    })
}

function setDefaultStatFilterValue(input: HTMLInputElement, retry = true) {
    if (input.value || editedStatFilterInputs.has(input)) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, '~')
    input.dataset.btApplyingTilde = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    delete input.dataset.btApplyingTilde
    if (retry)
        requestAnimationFrame(() => {
            if (input.isConnected) setDefaultStatFilterValue(input, false)
        })
}

export function startSearchEnhancements() {
    const style = document.createElement('style')
    style.textContent = searchEnhancementsCss
    document.head.append(style)

    let scheduled: ReturnType<typeof setTimeout> | undefined
    const tildeTimers = new Set<ReturnType<typeof setTimeout>>()
    const process = () => {
        scheduled = undefined
        const { disabled } = useSettingsStore.getState()
        if (disabled.includes('coloured-meta-tags')) restoreMetaTags()
        else document.querySelectorAll<HTMLElement>('.multiselect__option').forEach(decorateMetaTag)
    }
    const schedule = () => {
        if (scheduled === undefined) scheduled = setTimeout(process, 0)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.querySelector('#trade')?.parentElement ?? document.body, {
        childList: true,
        subtree: true,
    })
    const onInput = (event: Event) => {
        const input = event.target
        if (
            input instanceof HTMLInputElement &&
            input.matches(statFilterInputSelector) &&
            input.dataset.btApplyingTilde === undefined
        )
            editedStatFilterInputs.add(input)
    }
    const onStatFilterOpen = (event: Event) => {
        const input = event.target
        if (
            !(input instanceof HTMLInputElement) ||
            !input.matches(statFilterInputSelector) ||
            useSettingsStore.getState().disabled.includes('default-stat-filter-tilde')
        )
            return
        const timer = setTimeout(() => {
            tildeTimers.delete(timer)
            setDefaultStatFilterValue(input)
        }, 0)
        tildeTimers.add(timer)
    }
    document.addEventListener('input', onInput, true)
    document.addEventListener('click', onStatFilterOpen, true)
    const unsubscribe = useSettingsStore.subscribe(schedule)
    process()
    return () => {
        clearTimeout(scheduled)
        observer.disconnect()
        document.removeEventListener('input', onInput, true)
        document.removeEventListener('click', onStatFilterOpen, true)
        tildeTimers.forEach(clearTimeout)
        unsubscribe()
        restoreMetaTags()
        style.remove()
    }
}
