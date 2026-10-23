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
    async main(ctx) {
        if (!document.querySelector('#trade')) return
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
