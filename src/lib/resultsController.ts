import resultsCss from '../integrations/poe-trade/results.css?inline'
import {
    resultRows,
    tradeRoot,
    hasResultRows,
    isSearchElement,
    isModNode,
} from '../integrations/poe-trade/results'
import { useResultsStore } from '../stores/results'
import type { QueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '../stores/settings'
import { usePinnedStore } from '../stores/pinned'
import { currentLocation } from '../integrations/poe-trade/location'
import { getCurrencyRatios } from '../integrations/poe-ninja/currencyRatios'
import { createSimilarGroupState, regroupSimilarRows } from './results/similarGroups'
import { addEquivalentPrices } from './results/enhancers/equivalentPricing'
import { addPinButton } from './results/enhancers/pinning'
import { addItemLinks } from './results/enhancers/itemLinks'
import { addSocketWarning } from './results/enhancers/socketWarning'
import {
    clearHighlightedStats,
    highlightMatchingStats,
    statNeedles,
} from './results/enhancers/statHighlight'

export function startResultsController(client: QueryClient) {
    const style = document.createElement('style')
    style.textContent = resultsCss
    document.head.append(style)
    let stopped = false
    let running = false
    let pending = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let scheduled: ReturnType<typeof setTimeout> | undefined
    const cleanups = new Map<HTMLElement, (() => void)[]>()
    const clearEnhancements = () => {
        for (const [row, disposers] of cleanups) {
            disposers.forEach((dispose) => dispose())
            clearHighlightedStats(row)
            row.removeAttribute('bt-enhanced')
            row.removeAttribute('bt-regroup-state')
        }
        cleanups.clear()
    }
    const schedule = () => {
        if (stopped || scheduled !== undefined) return
        scheduled = setTimeout(() => {
            scheduled = undefined
            void process()
        }, 0)
    }
    async function process() {
        if (stopped) return
        if (running) {
            pending = true
            return
        }
        running = true
        try {
            const rows = resultRows()
            if (!rows.length && usePinnedStore.getState().pinned.length)
                usePinnedStore.getState().setPinned([])
            for (const [row, disposers] of cleanups)
                if (!row.isConnected) {
                    disposers.forEach((dispose) => dispose())
                    cleanups.delete(row)
                }
            const disabled = useSettingsStore.getState().disabled
            const context = currentLocation()
            let ratios: Record<string, number> = {}
            if (
                !disabled.includes('equivalent-pricings') &&
                context.league &&
                rows.some((row) => !cleanups.has(row))
            ) {
                try {
                    ratios = await getCurrencyRatios(client, context)
                } catch {
                    if (!retryTimer)
                        retryTimer = setTimeout(() => {
                            retryTimer = undefined
                            if (!stopped) {
                                clearEnhancements()
                                void process()
                            }
                        }, 30000)
                }
            }
            if (stopped) return
            const needles = statNeedles()
            const similarGroup = createSimilarGroupState()
            for (const row of rows) {
                clearHighlightedStats(row)
                if (!disabled.includes('highlight-stat-filters'))
                    highlightMatchingStats(row, needles)
                if (!cleanups.has(row)) {
                    const disposers: (() => void)[] = []
                    cleanups.set(row, disposers)
                    row.setAttribute('bt-enhanced', '')
                    const add = (node: HTMLElement, parent: Element) => {
                        parent.append(node)
                        disposers.push(() => node.remove())
                    }
                    addPinButton(row, add)
                    if (!disabled.includes('item-reference-links'))
                        addItemLinks(
                            row,
                            context.version,
                            add,
                            useResultsStore.getState().items.get(row.dataset.id ?? '')
                        )
                    if (!disabled.includes('maximum-sockets') && context.version === '1')
                        addSocketWarning(row, add)
                    if (!disabled.includes('equivalent-pricings'))
                        addEquivalentPrices(row, ratios, add, context.version)
                }
                if (!disabled.includes('regroup-similars'))
                    regroupSimilarRows(row, similarGroup, cleanups)
            }
        } finally {
            running = false
            if (pending) {
                pending = false
                schedule()
            }
        }
    }
    const observer = new MutationObserver((mutations) => {
        const newRows = resultRows().some((row) => !row.hasAttribute('bt-enhanced'))
        const changedSearch = mutations.some((mutation) => isSearchElement(mutation.target))
        const changedMods = mutations.some((mutation) => isModNode(mutation.target))
        if (changedMods) {
            const needles = statNeedles()
            for (const row of resultRows(true)) {
                clearHighlightedStats(row)
                if (!useSettingsStore.getState().disabled.includes('highlight-stat-filters'))
                    highlightMatchingStats(row, needles)
            }
        }
        if (newRows || changedSearch || !hasResultRows()) schedule()
    })
    observer.observe(tradeRoot(), {
        childList: true,
        characterData: true,
        subtree: true,
    })
    const onSearchInput = (event: Event) => {
        if (isSearchElement(event.target)) schedule()
    }
    document.addEventListener('input', onSearchInput, true)
    const unsubscribeItems = useResultsStore.subscribe((state, previous) => {
        if (useSettingsStore.getState().disabled.includes('item-reference-links')) return
        for (const [row, disposers] of cleanups) {
            const id = row.dataset.id ?? ''
            const item = state.items.get(id)
            if (!row.isConnected || !item || item === previous.items.get(id)) continue
            row.querySelectorAll('.bt-item-links').forEach((node) => node.remove())
            addItemLinks(
                row,
                currentLocation().version,
                (node, parent) => {
                    parent.append(node)
                    disposers.push(() => node.remove())
                },
                item
            )
        }
    })
    const unsubscribeSettings = useSettingsStore.subscribe((state, old) => {
        if (state.disabled !== old.disabled) {
            clearEnhancements()
            void process()
        }
    })
    const unsubscribe = usePinnedStore.subscribe((state) => {
        for (const row of document.querySelectorAll<HTMLElement>('[bt-enhanced]')) {
            const pinned = state.pinned.some((item) => item.id === row.dataset.id)
            row.classList.toggle('bt-pinned', pinned)
            const button = row.querySelector('.bt-pin-button')
            if (button) button.textContent = pinned ? 'Unpin' : 'Pin'
        }
    })
    void process()
    return () => {
        stopped = true
        clearTimeout(retryTimer)
        clearTimeout(scheduled)
        observer.disconnect()
        document.removeEventListener('input', onSearchInput, true)
        unsubscribe()
        unsubscribeItems()
        unsubscribeSettings()
        style.remove()
        for (const row of document.querySelectorAll<HTMLElement>('[bt-enhanced]'))
            row.classList.remove('bt-pinned', 'bt-scroll-target')
        clearEnhancements()
    }
}
