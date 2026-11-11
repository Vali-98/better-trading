import { reportIntegrationIssue } from '../integrations/diagnostics'

// Preferences may fall back to session state. Bookmark storage deliberately does not:
// a failed bookmark read must never masquerade as an empty, writable collection.
export const preferences = {
    getItem(key: string): string | null {
        try {
            return localStorage.getItem(key)
        } catch {
            reportIntegrationIssue('preferences', 'Preference read failed')
            return null
        }
    },
    setItem(key: string, value: string) {
        try {
            localStorage.setItem(key, value)
        } catch {
            reportIntegrationIssue('preferences', 'Preference save failed')
        }
    },
    removeItem(key: string) {
        try {
            localStorage.removeItem(key)
        } catch {
            reportIntegrationIssue('preferences', 'Preference removal failed')
        }
    },
}
