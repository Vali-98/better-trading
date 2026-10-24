import type { ItemPrice } from '../../models/priceTrend'

export function trendVariantDetails(price: ItemPrice) {
    const gem = ['skill-gems', 'imbued-gems'].includes(price.category)
    const match = gem ? price.variant?.match(/^(\d+)(?:\/(\d+))?(c)?$/i) : undefined
    const level = match ? Number(match[1]) : !price.variant ? price.gemLevel : undefined
    const quality =
        match?.[2] !== undefined ? Number(match[2]) : !price.variant ? price.gemQuality : undefined
    const corrupted = Boolean(price.corrupted || match?.[3])
    const label = [
        price.category === 'forbidden-jewels'
            ? (price.passiveName ?? price.name)
            : match
              ? undefined
              : price.variant,
        level !== undefined ? `Lv. ${level}` : '',
        quality !== undefined ? `Q ${quality}` : '',
        price.itemLevel !== undefined ? `ilvl ${price.itemLevel}` : '',
        price.mapTier !== undefined ? `Tier ${price.mapTier}` : '',
        price.links ? `${price.links}L` : '',
    ]
        .filter(Boolean)
        .join(' · ')
    return { label, corrupted }
}

export function trendVariantLabel(price: ItemPrice) {
    const { label, corrupted } = trendVariantDetails(price)
    return [label, corrupted ? 'Corrupted' : ''].filter(Boolean).join(' · ')
}

export function gemVariantValues(price: ItemPrice) {
    if (!['skill-gems', 'imbued-gems'].includes(price.category)) return undefined
    const match = price.variant?.match(/^(\d+)(?:\/(\d+))?(c)?$/i)
    const level = price.gemLevel ?? (match ? Number(match[1]) : undefined)
    const quality = price.gemQuality ?? (match?.[2] !== undefined ? Number(match[2]) : undefined)
    if (level === undefined && quality === undefined) return undefined
    return { level, quality, corrupted: Boolean(price.corrupted || match?.[3]) }
}
