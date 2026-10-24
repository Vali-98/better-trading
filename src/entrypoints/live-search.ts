import { installLiveBridge } from '../integrations/poe-trade/live/bridge'
export default defineUnlistedScript(() => {
    installLiveBridge()
})
