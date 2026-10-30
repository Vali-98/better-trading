import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { injectScript } from 'wxt/utils/inject-script'
import { useSettingsStore } from '../stores/settings'
import { reportIntegrationIssue } from '../integrations/diagnostics'

export function startSearchHistoryEnhancer(ctx: ContentScriptContext) {
    const syncSearchHistory = () =>
        window.postMessage(
            ctx.isInvalid
                ? { type: 'bt-stop-search-history' }
                : {
                      type: 'bt-search-history-setting',
                      enabled: !useSettingsStore.getState().disabled.includes('search-history'),
                  },
            location.origin
        )
    const unsubscribeHistory = useSettingsStore.subscribe(syncSearchHistory)
    ctx.onInvalidated(() => {
        unsubscribeHistory()
        window.postMessage({ type: 'bt-stop-search-history' }, location.origin)
    })
    void injectScript('/search-history.js')
        .then(syncSearchHistory)
        .catch(() => reportIntegrationIssue('poe-trade', 'Search history script injection failed'))
}
