import type { ResultEntry } from '../../models/item'
import { reportIntegrationIssue } from '../diagnostics'

export function decodeResultItems(payload: unknown): ResultEntry[] {
    if (!Array.isArray(payload)) {
        reportIntegrationIssue('poe-trade', 'Unexpected item response format')
        return []
    }
    const results: ResultEntry[] = []
    for (const entry of payload.slice(0, 100)) {
        if (!entry || typeof entry.id !== 'string' || entry.id.length > 128) continue
        const item = entry.item
        if (
            !item ||
            typeof item.frameType !== 'number' ||
            ![item.name, item.baseType, item.typeLine].every(
                (value) => typeof value === 'string' && value.length <= 500
            )
        ) {
            reportIntegrationIssue('poe-trade', 'Unexpected item fields')
            continue
        }
        results.push({
            id: entry.id,
            item: {
                name: item.name,
                baseType: item.baseType,
                typeLine: item.typeLine,
                frameType: item.frameType,
            },
        })
    }
    return results
}
