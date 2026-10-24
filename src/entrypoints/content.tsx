import { startLiveSearchEnhancer } from '../features/liveSearch/enhancer'
import { reportIntegrationIssue } from '../integrations/diagnostics'
import { decodeResultItems } from '../integrations/poe-trade/decode'
import { useResultsStore } from '../stores/results'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContentApp } from '../app/ContentApp'
import '../styles/panel.css'
import { startPageController } from '../lib/pageController'
import { startResultsController } from '../lib/resultsController'
import { startSearchEnhancements } from '../lib/searchEnhancements'
import { browser } from 'wxt/browser'

export default defineContentScript({
    matches: ['*://www.pathofexile.com/trade*', '*://pathofexile.com/trade*'],
    cssInjectionMode: 'ui',
    runAt: 'document_start',
    async main(ctx) {
        ctx.onInvalidated(startLiveSearchEnhancer())
        const onItems = (event: MessageEvent) => {
            if (
                event.source !== window ||
                event.origin !== location.origin ||
                event.data?.type !== 'bt-result-items' ||
                typeof event.data.payload !== 'string' ||
                event.data.payload.length > 500000
            )
                return
            try {
                useResultsStore
                    .getState()
                    .receive(decodeResultItems(JSON.parse(event.data.payload)))
            } catch {
                /* Ignore malformed bridge messages. */
            }
        }
        window.addEventListener('message', onItems)
        ctx.onInvalidated(() => {
            window.removeEventListener('message', onItems)
            window.postMessage({ type: 'bt-stop-item-capture' }, location.origin)
            useResultsStore.setState({ items: new Map() })
        })
        void injectScript('/item-capture.js').catch(() =>
            reportIntegrationIssue('poe-trade', 'Item capture script injection failed')
        )
        if (document.readyState === 'loading')
            await new Promise<void>((resolve) =>
                document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
            )
        if (ctx.isInvalid || !document.querySelector('#trade')) return
        const queryClient = new QueryClient()
        const onStorage = (changes: Record<string, unknown>, area: string) => {
            if (area !== 'local') return
            if (Object.keys(changes).some((key) => key.startsWith('bookmark-')))
                void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
            if ('trade-history' in changes)
                void queryClient.invalidateQueries({ queryKey: ['history'] })
        }
        browser.storage.onChanged.addListener(onStorage)
        ctx.onInvalidated(() => browser.storage.onChanged.removeListener(onStorage))
        const stopPage = startPageController(queryClient)
        ctx.onInvalidated(stopPage)
        ctx.onInvalidated(startResultsController(queryClient))
        ctx.onInvalidated(startSearchEnhancements())
        const ui = await createShadowRootUi(ctx, {
            name: 'better-trading',
            position: 'inline',
            anchor: 'body',
            onMount(container) {
                const root = createRoot(container)
                root.render(
                    <QueryClientProvider client={queryClient}>
                        <ContentApp />
                    </QueryClientProvider>
                )
                return root
            },
            onRemove(root) {
                root?.unmount()
                queryClient.clear()
            },
        })
        ui.mount()
    },
})
