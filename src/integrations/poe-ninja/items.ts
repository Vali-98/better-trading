import { reportIntegrationIssue } from '../diagnostics'
import type { ItemPrice } from '../../models/priceTrend'
export function parseItemPrices(data: unknown, category: string): ItemPrice[] {
    if (!data || typeof data !== 'object' || !('lines' in data) || !Array.isArray(data.lines)) {
        reportIntegrationIssue('poe-ninja', 'Unexpected item overview format')
        return []
    }
    const core =
        'core' in data && data.core && typeof data.core === 'object' ? data.core : undefined
    const primary =
        core && 'primary' in core && typeof core.primary === 'string' ? core.primary : undefined
    const primaryItems = core && 'items' in core && Array.isArray(core.items) ? core.items : []
    const primaryName = primaryItems.find((item) => item?.id === primary)?.name
    const validPrice = (amount: unknown): amount is number =>
        typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
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
                price:
                    validPrice(line.primaryValue) && primary
                        ? {
                              amount: line.primaryValue,
                              currency: typeof primaryName === 'string' ? primaryName : primary,
                          }
                        : validPrice(line.divineValue) && line.divineValue >= 1
                          ? { amount: line.divineValue, currency: 'Divine Orb' }
                          : validPrice(line.chaosValue)
                            ? { amount: line.chaosValue, currency: 'Chaos Orb' }
                            : undefined,
                baseType: typeof line.baseType === 'string' ? line.baseType : '',
                detailsId: line.detailsId,
                category,
                tradeStatIds: Array.isArray(line.tradeInfo)
                    ? line.tradeInfo.flatMap((info: { mod?: unknown }) =>
                          typeof info?.mod === 'string' ? [info.mod] : []
                      )
                    : undefined,
                explicitModifiers: Array.isArray(line.explicitModifiers)
                    ? line.explicitModifiers.flatMap((mod: { text?: unknown }) =>
                          typeof mod?.text === 'string' ? [mod.text] : []
                      )
                    : undefined,
                passiveName:
                    typeof line.metadata?.passiveName === 'string'
                        ? line.metadata.passiveName
                        : undefined,
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
