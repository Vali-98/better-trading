import { reportIntegrationIssue } from '../diagnostics'

interface CurrencyOverview {
    lines: { id: string; primaryValue: number }[]
    items: { id: string; detailsId: string }[]
}
export function decodeCurrencyOverview(value: unknown): CurrencyOverview | null {
    if (
        !value ||
        typeof value !== 'object' ||
        !('lines' in value) ||
        !Array.isArray(value.lines) ||
        !('items' in value) ||
        !Array.isArray(value.items) ||
        !value.lines.every(
            (line) =>
                line &&
                typeof line.id === 'string' &&
                typeof line.primaryValue === 'number' &&
                Number.isFinite(line.primaryValue)
        ) ||
        !value.items.every(
            (item) => item && typeof item.id === 'string' && typeof item.detailsId === 'string'
        )
    ) {
        reportIntegrationIssue('poe-ninja', 'Unexpected currency overview format')
        return null
    }
    return {
        lines: value.lines.map(({ id, primaryValue }) => ({ id, primaryValue })),
        items: value.items.map(({ id, detailsId }) => ({ id, detailsId })),
    }
}
