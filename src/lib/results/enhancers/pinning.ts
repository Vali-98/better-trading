import { usePanelStore } from '../../../stores/panel'
import { usePinnedStore } from '../../../stores/pinned'
import type { AddNode } from './types'

export function addPinButton(row: HTMLElement, add: AddNode) {
    const buttons = row.querySelector('.details .btns')
    if (!buttons) return
    const button = document.createElement('button')
    button.className = 'btn btn-default bt-pin-button'
    button.textContent = 'Pin'
    button.onclick = () => {
        const id = row.dataset.id!
        const state = usePinnedStore.getState()
        if (state.pinned.some((item) => item.id === id)) {
            state.setPinned(state.pinned.filter((item) => item.id !== id))
            return
        }
        const node = document.createElement('div')
        for (const selector of ['.middle', '.itemRendered', '.details .price']) {
            const part = row.querySelector(selector)
            if (part) node.append(part.cloneNode(true))
        }
        node.querySelectorAll('script,iframe,object,button').forEach((element) => element.remove())
        state.setPinned([...state.pinned, { id, pinnedAt: new Date().toISOString(), node }])
        usePanelStore.getState().setPage('pinned-items')
    }
    add(button, buttons)
}
