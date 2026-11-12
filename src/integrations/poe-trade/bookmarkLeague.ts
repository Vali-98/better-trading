import { currentLocation } from './location'
import { reportIntegrationIssue } from '../diagnostics'

export interface BookmarkLeague {
    league?: string
    warning?: string
}
const missing = 'Select a league on the trade page to open saved searches.'
const unavailable = 'This league isn’t listed as available. Select a league on the trade page.'

export function validLeague(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.trim().length > 0 &&
        !/[\u0000-\u001f?#\\]/.test(value) &&
        value.split('/').every((part) => part.trim() && !/^(null|undefined)$/i.test(part.trim()))
    )
}

// A recognised but empty selector is authoritative. Only a missing/unreadable
// selector falls back to the URL; never revive a stale URL league after clearing it.
export function readBookmarkLeague(): BookmarkLeague {
    const context = currentLocation()
    try {
        if (typeof document !== 'undefined') {
            const platform = Array.from(
                document.querySelectorAll('#trade .multiselect.status-select')
            ).find((node) =>
                /^PoE\s+[12]\s+(PC|Xbox|Sony)$/i.test(
                    node.querySelector('.multiselect__single')?.textContent?.trim() ?? ''
                )
            )
            const selector = platform?.nextElementSibling
            if (selector?.matches('.multiselect.status-select')) {
                const selected = selector.querySelector('.multiselect__single')?.textContent?.trim()
                if (!validLeague(selected)) return { warning: missing }
                const platformText = platform!.querySelector('.multiselect__single')!.textContent!
                if (!new RegExp(`^PoE\\s+${context.version}\\s+`, 'i').test(platformText.trim()))
                    return { warning: missing }
                const options = Array.from(
                    selector.querySelectorAll('.multiselect__element .multiselect__option')
                )
                    .map((node) => node.textContent?.trim())
                    .filter(Boolean)
                if (options.length && !options.includes(selected)) return { warning: unavailable }
                const realm = /Xbox/i.test(platformText)
                    ? 'xbox'
                    : /Sony/i.test(platformText)
                      ? 'sony'
                      : context.version === '2' && context.league?.startsWith('poe2/')
                        ? 'poe2'
                        : undefined
                return { league: realm ? `${realm}/${selected}` : selected }
            }
        }
    } catch {
        reportIntegrationIssue('poe-trade', 'League selector could not be read')
    }
    return validLeague(context.league) ? { league: context.league } : { warning: missing }
}
