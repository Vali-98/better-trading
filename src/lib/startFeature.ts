import { reportIntegrationIssue } from '../integrations/diagnostics'

export function startFeature(name: string, start: () => void | (() => void)) {
    try {
        const stop = start()
        return () => {
            try {
                stop?.()
            } catch {
                reportIntegrationIssue('enhancers', `${name} cleanup failed`)
            }
        }
    } catch {
        reportIntegrationIssue('enhancers', `${name} startup failed`)
        return () => {}
    }
}
