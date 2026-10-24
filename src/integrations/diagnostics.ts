const reported = new Set<string>()

// No payloads, seller information, or credentials are included in diagnostics.
export function reportIntegrationIssue(integration: string, operation: string) {
    const key = `${integration}:${operation}`
    if (reported.has(key)) return
    reported.add(key)
    console.warn(
        `[Better Trading] ${integration}: ${operation}. The affected enhancement may be unavailable.`
    )
}
