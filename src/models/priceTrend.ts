export interface ItemPrice {
    name: string
    baseType: string
    detailsId: string
    category: string
    variant?: string
    links?: number
    corrupted?: boolean
    gemLevel?: number
    gemQuality?: number
    itemLevel?: number
    mapTier?: number
    sparkLine: { data: (number | null)[]; totalChange?: number }
}
