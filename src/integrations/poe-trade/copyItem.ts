import { readItemText } from './itemText'
import { reportIntegrationIssue } from '../diagnostics'

function legacyCopy(text: string) {
    const previous = document.activeElement as HTMLElement | null
    const field = document.createElement('textarea')
    field.value = text
    field.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.append(field)
    try {
        field.select()
        if (!document.execCommand('copy')) throw new Error('Clipboard rejected')
    } finally {
        field.remove()
        previous?.focus()
    }
}

export function enhanceCopyItem(row: HTMLElement, version: '1' | '2'): () => void {
    if (version !== '2') return () => {}
    const button = row.querySelector<HTMLButtonElement>('.left button.copy')
    if (!button) return () => {}
    const title = button.title
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const feedback = (message: string) => {
        if (stopped) return
        clearTimeout(timer)
        button.title = message
        timer = setTimeout(() => {
            button.title = title
        }, 3000)
    }
    const onClick = (event: MouseEvent) => {
        if (
            !button.classList.contains('hidden') &&
            !button.hidden &&
            button.style.display !== 'none'
        )
            return
        event.preventDefault()
        event.stopImmediatePropagation()
        const value = readItemText(row)
        if (!value) {
            feedback('Unable to read item details')
            reportIntegrationIssue('poe-trade', 'Copy item text unavailable')
            return
        }
        const copy = navigator.clipboard?.writeText
            ? navigator.clipboard.writeText(value).catch(() => legacyCopy(value))
            : Promise.resolve().then(() => legacyCopy(value))
        void copy
            .then(() => feedback('Item copied'))
            .catch(() => {
                feedback('Unable to copy item. Keep the trade tab focused and try again.')
                reportIntegrationIssue('poe-trade', 'Clipboard write failed')
            })
    }
    button.classList.add('bt-copy-fallback')
    button.addEventListener('click', onClick, true)
    return () => {
        stopped = true
        clearTimeout(timer)
        button.removeEventListener('click', onClick, true)
        button.classList.remove('bt-copy-fallback')
        button.title = title
    }
}
