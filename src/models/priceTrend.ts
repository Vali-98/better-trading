export interface ItemPrice {
    name: string
    baseType: string
    detailsId: string
    category: string
    price?: { amount: number; currency: string }
    tradeStatIds?: string[]
    explicitModifiers?: string[]
    passiveName?: string
    variant?: string
    links?: number
    corrupted?: boolean
    gemLevel?: number
    gemQuality?: number
    itemLevel?: number
    mapTier?: number
    sparkLine: { data: (number | null)[]; totalChange?: number }
}

export interface ItemPriceOverview {
    prices: ItemPrice[]
    complete: boolean
}
