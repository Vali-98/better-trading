import { reportIntegrationIssue } from '../../../integrations/diagnostics'
import type { AddNode } from './types'

export function disposeEnhancer(dispose: () => void) {
    try {
        dispose()
    } catch {
        reportIntegrationIssue('enhancers', 'Enhancer cleanup failed')
    }
}

// Each installation owns its injected nodes and disposers. Roll back a failed
// installation without undoing another enhancer or blocking later rows.
export function installEnhancer(
    name: string,
    disposers: (() => void)[],
    install: (add: AddNode, cleanup: (dispose: () => void) => void) => void
) {
    const owned: (() => void)[] = []
    try {
        install(
            (node, parent) => {
                owned.push(() => node.remove())
                parent.append(node)
            },
            (dispose) => owned.push(dispose)
        )
        disposers.push(...owned)
    } catch {
        owned.reverse().forEach(disposeEnhancer)
        reportIntegrationIssue('enhancers', `${name} failed`)
    }
}
