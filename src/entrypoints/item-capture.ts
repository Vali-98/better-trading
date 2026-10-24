import { installItemCapture } from '../integrations/poe-trade/capture'

export default defineUnlistedScript(() => {
    const stop = installItemCapture()
    const onMessage = (event: MessageEvent) => {
        if (
            event.source !== window ||
            event.origin !== location.origin ||
            event.data?.type !== 'bt-stop-item-capture'
        )
            return
        stop()
        window.removeEventListener('message', onMessage)
    }
    window.addEventListener('message', onMessage)
})
