import { subscribePageUpdates } from './page/updates'
import { installEnhancer, disposeEnhancer } from './results/enhancers/isolation'
import { enhanceCopyItem } from '../integrations/poe-trade/copyItem'
import resultsCss from '../integrations/poe-trade/results.css?inline'
import {
    resultRows,
    hasResultRows,
    isSearchElement,
    isModNode,
} from '../integrations/poe-trade/results'
import { useResultsStore } from '../stores/results'
import type { QueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '../stores/settings'
import { usePinnedStore } from '../stores/pinned'
import { currentLocation } from '../integrations/poe-trade/location'
import { getCurrencyRatios } from './prices/currencyRatios'
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
    let ratioRequest:
        { key: string; value?: Record<string, number>; retryAfter?: number } | undefined
    const pricedRows = new Set<HTMLElement>()
    const cleanups = new Map<HTMLElement, (() => void)[]>()
    const clearEnhancements = () => {
        for (const [row, disposers] of cleanups) {
            disposers.forEach(disposeEnhancer)
            disposeEnhancer(() => clearHighlightedStats(row))
            row.removeAttribute('bt-enhanced')
            row.removeAttribute('bt-regroup-state')
        }
        cleanups.clear()
        pricedRows.clear()
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
                    disposers.forEach(disposeEnhancer)
                    cleanups.delete(row)
                    pricedRows.delete(row)
                }
            const disabled = useSettingsStore.getState().disabled
            const context = currentLocation()
            const ratioKey = `${context.version}/${context.league}`
            if (
                !disabled.includes('equivalent-pricings') &&
                context.league &&
                (!ratioRequest ||
                    ratioRequest.key !== ratioKey ||
                    (ratioRequest.retryAfter !== undefined &&
                        Date.now() >= ratioRequest.retryAfter))
            ) {
                const request: NonNullable<typeof ratioRequest> = { key: ratioKey }
                ratioRequest = request
                // Pricing never delays copy, links, pinning, or other row enhancements.
                void getCurrencyRatios(client, context)
                    .then((value) => {
                        if (stopped || ratioRequest !== request) return
                        request.value = value
                        schedule()
                    })
                    .catch(() => {
                        if (stopped || ratioRequest !== request) return
                        request.retryAfter = Date.now() + 30_000
                        clearTimeout(retryTimer)
                        retryTimer = setTimeout(schedule, 30_000)
                    })
            }
            const ratios = ratioRequest?.key === ratioKey ? ratioRequest.value : undefined
            if (stopped) return
            if (disabled !== useSettingsStore.getState().disabled) {
                pending = true
                return
            }
            let needles: RegExp[] = []
            installEnhancer('Stat filter matching', [], () => {
                needles = statNeedles()
            })
            const similarGroup = createSimilarGroupState()
            for (const row of rows) {
                if (!row.isConnected) continue
                installEnhancer('Stat highlighting', [], () => {
                    clearHighlightedStats(row)
                    if (!disabled.includes('highlight-stat-filters'))
                        highlightMatchingStats(row, needles)
                })
                if (!cleanups.has(row)) {
                    const disposers: (() => void)[] = []
                    cleanups.set(row, disposers)
                    row.setAttribute('bt-enhanced', '')
                    installEnhancer('Copy item', disposers, (_add, cleanup) =>
                        cleanup(enhanceCopyItem(row, context.version))
                    )
                    installEnhancer('Pinning', disposers, (add) => addPinButton(row, add))
                    if (!disabled.includes('item-reference-links'))
                        installEnhancer('Item links', disposers, (add) =>
                            addItemLinks(
                                row,
                                context.version,
                                add,
                                useResultsStore.getState().items.get(row.dataset.id ?? '')
                            )
                        )
                    if (!disabled.includes('maximum-sockets') && context.version === '1')
                        installEnhancer('Socket warning', disposers, (add) =>
                            addSocketWarning(row, add)
                        )
                }
                if (!disabled.includes('equivalent-pricings') && ratios && !pricedRows.has(row)) {
                    installEnhancer('Equivalent pricing', cleanups.get(row)!, (add) =>
                        addEquivalentPrices(row, ratios, add, context.version)
                    )
                    pricedRows.add(row)
                }
                if (!disabled.includes('regroup-similars'))
                    installEnhancer('Similar grouping', [], () =>
                        regroupSimilarRows(row, similarGroup, cleanups)
                    )
            }
        } finally {
            running = false
            if (pending) {
                pending = false
                schedule()
            }
        }
    }
    const unsubscribePage = subscribePageUpdates(({ mutations, contextChanged }) => {
        const newRows = resultRows().some((row) => !row.hasAttribute('bt-enhanced'))
        const changedSearch = mutations.some((mutation) => isSearchElement(mutation.target))
        const changedMods = mutations.some((mutation) => isModNode(mutation.target))
        if (newRows || changedSearch || changedMods || contextChanged || !hasResultRows())
            schedule()
    }, 'Result enhancement updates')
    const unsubscribeItems = useResultsStore.subscribe((state, previous) => {
        if (useSettingsStore.getState().disabled.includes('item-reference-links')) return
        for (const [row, disposers] of cleanups) {
            const id = row.dataset.id ?? ''
            const item = state.items.get(id)
            if (!row.isConnected || !item || item === previous.items.get(id)) continue
            installEnhancer('Item links update', disposers, (add) => {
                row.querySelectorAll('.bt-item-links').forEach((node) => node.remove())
                addItemLinks(row, currentLocation().version, add, item)
            })
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
        unsubscribePage()
        unsubscribe()
        unsubscribeItems()
        unsubscribeSettings()
        style.remove()
        for (const row of document.querySelectorAll<HTMLElement>('[bt-enhanced]'))
            row.classList.remove('bt-pinned', 'bt-scroll-target')
        clearEnhancements()
    }
}
