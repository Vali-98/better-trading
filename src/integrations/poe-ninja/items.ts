import { reportIntegrationIssue } from '../diagnostics'
import type { ItemPrice } from '../../models/priceTrend'
export function parseItemPrices(data: unknown, category: string): ItemPrice[] {
    if (!data || typeof data !== 'object' || !('lines' in data) || !Array.isArray(data.lines)) {
        reportIntegrationIssue('poe-ninja', 'Unexpected item overview format')
        return []
    }
    return data.lines.flatMap((line) => {
        if (
            !line ||
            !['name', 'detailsId'].every((key) => typeof line[key] === 'string') ||
            !Array.isArray(line.sparkLine?.data)
        )
            return []
        const points = line.sparkLine.data
            .slice(0, 100)
            .map((point: unknown) =>
                typeof point === 'number' && Number.isFinite(point) ? point : null
            )
        if (points.filter((point: number | null) => point !== null).length < 2) return []
        return [
            {
                name: line.name,
                baseType: typeof line.baseType === 'string' ? line.baseType : '',
                detailsId: line.detailsId,
                category,
                variant: typeof line.variant === 'string' ? line.variant : undefined,
                links: typeof line.links === 'number' ? line.links : undefined,
                corrupted: typeof line.corrupted === 'boolean' ? line.corrupted : undefined,
                gemLevel: typeof line.gemLevel === 'number' ? line.gemLevel : undefined,
                gemQuality: typeof line.gemQuality === 'number' ? line.gemQuality : undefined,
                itemLevel:
                    category === 'base-types' && typeof line.levelRequired === 'number'
                        ? line.levelRequired
                        : undefined,
                mapTier: typeof line.mapTier === 'number' ? line.mapTier : undefined,
                sparkLine: {
                    data: points,
                    totalChange:
                        typeof line.sparkLine.totalChange === 'number' &&
                        Number.isFinite(line.sparkLine.totalChange)
                            ? line.sparkLine.totalChange
                            : undefined,
                },
            },
        ]
    })
}
