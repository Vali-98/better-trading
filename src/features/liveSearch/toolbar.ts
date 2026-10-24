import type { LiveState } from '../../models/liveSearch'
import { liveToolbar, placeMergeControl } from '../../integrations/poe-trade/live/page'

interface ToolbarViewState {
    state: LiveState
    candidates: { id: number; label: string }[]
    message: string
    busy: boolean
}
export function createLiveToolbar({
    onMerge,
    command,
}: {
    onMerge: (target: number) => void
    command: (action: string, extra: Record<string, unknown>) => void
}) {
    let host: HTMLDivElement | undefined
    let mergeControl: HTMLSpanElement | undefined
    let lastRender = ''
    const render = ({ state, candidates, message, busy }: ToolbarViewState) => {
        if (!document.body) return
        const anchor = liveToolbar()
        if (!anchor) return
        if (!host) {
            host = document.createElement('div')
            host.className = 'bt-live-searches'
        }
        if (!host.isConnected) {
            anchor.append(host)
            lastRender = ''
        }
        if (!mergeControl) {
            mergeControl = document.createElement('span')
            mergeControl.className = 'bt-live-merge'
        }
        placeMergeControl(mergeControl)
        const signature = JSON.stringify([state, candidates, message, busy])
        if (lastRender === signature) return
        lastRender = signature
        host.replaceChildren()
        mergeControl.replaceChildren()
        mergeControl.title = candidates.length ? '' : 'No active search tabs'
        const button = (text: string, action: () => void, disabled = false) => {
            const element = document.createElement('button')
            element.type = 'button'
            element.className = 'btn'
            element.textContent = text
            element.disabled = disabled
            element.addEventListener('click', action)
            return element
        }
        {
            const select = document.createElement('select')
            select.setAttribute('aria-label', 'Destination Live Search tab')
            for (const tab of candidates) {
                const option = document.createElement('option')
                option.value = String(tab.id)
                option.textContent = tab.label
                select.append(option)
            }
            if (candidates.length > 1) mergeControl.append(select)
            mergeControl.append(
                button('Merge', () => onMerge(Number(select.value)), busy || !candidates.length)
            )
        }
        if (state.subscriptions.length) {
            const title = document.createElement('strong')
            title.textContent = `Live searches (${state.subscriptions.length + 1})`
            host.append(title)
            const native = document.createElement('span')
            native.textContent = `${state.native?.label || 'Main search'} · ${state.native ? 'active' : 'stopped'}`
            host.append(native)
            for (const subscription of state.subscriptions) {
                const row = document.createElement('div')
                row.className = 'bt-live-subscription'
                const name = document.createElement('span')
                name.textContent = `${subscription.label} · ${subscription.status}`
                name.title = subscription.message ?? subscription.label
                row.append(
                    name,
                    button(subscription.enabled ? 'Pause' : 'Resume', () =>
                        command(subscription.enabled ? 'pause' : 'resume', {
                            key: subscription.key,
                        })
                    ),
                    button('Remove', () => command('remove', { key: subscription.key }))
                )
                if (subscription.enabled && subscription.status === 'error')
                    row.append(button('Retry', () => command('resume', { key: subscription.key })))
                host.append(row)
            }
        }
        const notice =
            message ||
            (state.subscriptions.length || (!state.native && /\/live\/?$/.test(location.pathname))
                ? state.message
                : '')
        if (notice) {
            const status = document.createElement('span')
            status.setAttribute('role', 'status')
            status.textContent = notice
            host.append(status)
        }
        host.hidden = !host.childNodes.length
        mergeControl.hidden = !mergeControl.childNodes.length
    }
    return {
        render,
        remove() {
            host?.remove()
            mergeControl?.remove()
            host = undefined
            mergeControl = undefined
            lastRender = ''
        },
    }
}
