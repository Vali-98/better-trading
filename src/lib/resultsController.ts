import type { QueryClient } from '@tanstack/react-query'
import { useSettingsStore } from '../stores/settings'
import { usePinnedStore } from '../stores/pinned'
import { currentLocation } from './bookmarks/storage'
import { getCurrencyRatios } from './results/currencyRatios'
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
    style.textContent =
        '.bt-highlight-stat-filters{background:rgba(138,86,9,.35);color:#fff8e1!important}.bt-maximum-sockets{color:#e9bd66;text-align:center}.bt-equivalent-pricings{display:block;color:#aaa}.bt-equivalent-pricings img{height:20px;vertical-align:middle}[bt-regroup-state=\"hidden\"]{display:none!important}.bt-pinned{outline:1px solid #8a5609}.bt-pin-button{margin-left:4px}.bt-pinned-snapshot{box-sizing:border-box;width:100%;max-width:100%;min-width:0;background:#000;overflow:hidden}.bt-pinned-snapshot .middle{width:100%!important;max-width:100%;min-width:0}.bt-pinned-snapshot .itemPopupContainer,.bt-pinned-snapshot .itemRendered,.bt-pinned-snapshot .item-popup{max-width:100%!important;min-width:0!important;margin:0 auto;background:#000;box-sizing:border-box}.bt-pinned-snapshot .itemRendered{width:100%!important}.bt-pinned-snapshot .itemPopupAdditional{display:flex;padding:3px 0;background:#000}.bt-pinned-snapshot .itemPopupAdditional .s{width:33.33%;text-align:center}.bt-pinned-snapshot .price{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;padding:5px 10px 10px;background:#000;color:#a38d6d}.bt-pinned-snapshot .price img{height:25px;width:auto}.bt-pinned-snapshot .price br,.bt-pinned-snapshot .price .currency-text span,.bt-pinned-snapshot .price .price-label{display:none}.bt-pinned-snapshot .newItemContainer .sockets{display:block}.resultset > div.row.bt-scroll-target{background-image:linear-gradient(rgba(180,145,35,.16),rgba(180,145,35,.16))!important}.bt-equivalent-pricings{color:#a38d6d}.bt-equivalent-pricings img{display:inline-block;height:20px;width:auto;vertical-align:middle}.results:not(.compact) .bt-equivalent-pricings{background:rgba(255,255,255,.1)}'
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
            const rows = Array.from(
                document.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]')
            ).filter((row) => !row.classList.contains('exchange'))
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
                        addItemLinks(row, context.version, add)
                    if (!disabled.includes('maximum-sockets') && context.version === '1')
                        addSocketWarning(row, add)
                    if (!disabled.includes('equivalent-pricings'))
                        addEquivalentPrices(row, ratios, add)
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
        const newRows = Array.from(
            document.querySelectorAll<HTMLElement>(
                '.resultset > div.row[data-id]:not([bt-enhanced])'
            )
        ).some((row) => !row.classList.contains('exchange'))
        const changedSearch = mutations.some(
            (mutation) =>
                mutation.target instanceof Element &&
                Boolean(mutation.target.closest('.search-advanced-pane'))
        )
        const changedMods = mutations.some((mutation) => {
            const target =
                mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
            return Boolean(target?.closest('.item-mod,.explicitMod,.implicitMod,.pseudoMod'))
        })
        if (changedMods) {
            const needles = statNeedles()
            for (const row of document.querySelectorAll<HTMLElement>(
                '.resultset > div.row[data-id]'
            )) {
                clearHighlightedStats(row)
                if (!useSettingsStore.getState().disabled.includes('highlight-stat-filters'))
                    highlightMatchingStats(row, needles)
            }
        }
        if (newRows || changedSearch || !document.querySelector('.resultset > div.row')) schedule()
    })
    observer.observe(document.querySelector('#trade')?.parentElement ?? document.body, {
        childList: true,
        characterData: true,
        subtree: true,
    })
    const onSearchInput = (event: Event) => {
        if (event.target instanceof Element && event.target.closest('.search-advanced-pane'))
            schedule()
    }
    document.addEventListener('input', onSearchInput, true)
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
        unsubscribeSettings()
        style.remove()
        for (const row of document.querySelectorAll<HTMLElement>('[bt-enhanced]'))
            row.classList.remove('bt-pinned', 'bt-scroll-target')
        clearEnhancements()
    }
}
