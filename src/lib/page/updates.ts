import { currentLocation } from '../../integrations/poe-trade/location'
import { itemSearchText } from '../../integrations/poe-trade/searchInputs'
import { recommendTitle, statFilterState } from '../../integrations/poe-trade/searchPanel'
import { reportIntegrationIssue } from '../../integrations/diagnostics'

export interface PageContext {
    pathname: string
    location: ReturnType<typeof currentLocation>
    itemText: string
    title: string
    statsKey: string
}
export interface PageUpdate {
    context: PageContext
    mutations: MutationRecord[]
    contextChanged: boolean
}
type Listener = (update: PageUpdate) => void | Promise<void>
const subscribers = new Map<Listener, string>()
let context: PageContext | undefined
let stop: (() => void) | undefined
let flush: (() => void) | undefined

function readContext(): PageContext {
    return {
        pathname: location.pathname,
        location: currentLocation(),
        itemText: itemSearchText(),
        title: recommendTitle(),
        statsKey: statFilterState(),
    }
}
function deliver(listener: Listener, update: PageUpdate, name: string) {
    try {
        void Promise.resolve(listener(update)).catch(() =>
            reportIntegrationIssue('enhancers', `${name} failed`)
        )
    } catch {
        reportIntegrationIssue('enhancers', `${name} failed`)
    }
}
function start() {
    let records: MutationRecord[] = []
    let scheduled: ReturnType<typeof setTimeout> | undefined
    const update = () => {
        scheduled = undefined
        const next = readContext()
        const contextChanged = JSON.stringify(next) !== JSON.stringify(context)
        context = next
        const mutations = records
        records = []
        if (contextChanged || mutations.length)
            for (const [listener, name] of [...subscribers])
                deliver(listener, { context: next, contextChanged, mutations }, name)
    }
    flush = () => {
        if (scheduled === undefined) scheduled = setTimeout(update, 0)
    }
    const observer = new MutationObserver((mutations) => {
        const relevant = mutations.filter((mutation) => {
            if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return true
            const hostClasses = (value: string) =>
                value
                    .split(/\s+/)
                    .filter((name) => name && !name.startsWith('bt-'))
                    .sort()
                    .join(' ')
            return (
                hostClasses(mutation.oldValue ?? '') !==
                hostClasses((mutation.target as Element).getAttribute('class') ?? '')
            )
        })
        if (!relevant.length) return
        records.push(...relevant)
        flush?.()
    })
    observer.observe(document.documentElement ?? document, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'class'],
        attributeOldValue: true,
    })
    // Native history changes and programmatic input values need a shared fallback.
    const timer = setInterval(() => flush?.(), 500)
    document.addEventListener('input', flush, true)
    document.addEventListener('change', flush, true)
    window.addEventListener('popstate', flush)
    stop = () => {
        observer.disconnect()
        clearInterval(timer)
        clearTimeout(scheduled)
        document.removeEventListener('input', flush!, true)
        document.removeEventListener('change', flush!, true)
        window.removeEventListener('popstate', flush!)
        flush = undefined
        context = undefined
        records = []
    }
}
export function subscribePageUpdates(listener: Listener, name = 'Page update subscriber') {
    if (!subscribers.size) start()
    subscribers.set(listener, name)
    context = readContext()
    deliver(listener, { context, mutations: [], contextChanged: true }, name)
    return () => {
        subscribers.delete(listener)
        if (!subscribers.size) {
            stop?.()
            stop = undefined
        }
    }
}
