import { resultRows } from '../results'

export function liveToolbar() {
    return document.querySelector<HTMLElement>('.controls-left')
}
export function deactivateLiveSearch() {
    const button = document.querySelector<HTMLButtonElement>('button.livesearch-btn')
    if (!button || button.disabled) return false
    button.click()
    return true
}
export function applyListingSources(labels: Map<string, Map<string, string>>) {
    for (const row of resultRows()) {
        const sources = labels.get(row.dataset.id!)
        if (!sources) continue
        const left = row.querySelector<HTMLElement>(':scope > .left')
        if (!left) continue
        let badge = row.querySelector<HTMLElement>('.bt-live-source')
        if (!badge) {
            badge = document.createElement('div')
            badge.className = 'bt-live-source'
            left.prepend(badge)
        }
        if (left.firstElementChild !== badge) {
            left.prepend(badge)
        }
        const text = [...sources.values()].join(' · ')
        if (badge.textContent !== text) badge.textContent = text
        badge.title = text
    }
}
export function clearListingSources() {
    document.querySelectorAll('.bt-live-source').forEach((node) => node.remove())
}

// Only used when a folder action has just created a new destination tab.
export function activateLiveSearch() {
    const button = document.querySelector<HTMLButtonElement>('button.livesearch-btn')
    if (
        button &&
        !button.disabled &&
        /^Activate Live Search$/i.test(button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    )
        button.click()
}

export function placeMergeControl(control: HTMLElement) {
    const button = document.querySelector<HTMLButtonElement>('button.livesearch-btn')
    if (!button) return
    if (button.nextElementSibling !== control) button.after(control)
    const height = button.getBoundingClientRect().height
    if (height > 0) control.style.setProperty('--bt-live-button-height', `${height}px`)
}
