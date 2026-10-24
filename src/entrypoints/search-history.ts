import { installSearchHistory } from '../integrations/poe-trade/searchHistory'

export default defineUnlistedScript(() => {
    let enabled = true
    try {
        enabled = !localStorage
            .getItem('bt-disabled-settings')
            ?.split(',')
            .includes('search-history')
    } catch {
        // Match the default-on setting when storage is unavailable.
    }
    const history = installSearchHistory(enabled)
    const onMessage = (event: MessageEvent) => {
        if (event.source !== window || event.origin !== location.origin) return
        if (
            event.data?.type === 'bt-search-history-setting' &&
            typeof event.data.enabled === 'boolean'
        )
            history.setEnabled(event.data.enabled)
        if (event.data?.type === 'bt-stop-search-history') {
            history.stop()
            window.removeEventListener('message', onMessage)
        }
    }
    window.addEventListener('message', onMessage)
})
