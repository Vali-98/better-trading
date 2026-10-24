export type GameVersion = '1' | '2'
export type PerGame<T> = T | { readonly poe1: T; readonly poe2: T }
export type FilterKind = 'number' | 'choice' | 'sockets'
export interface NumericRange {
    min?: number
    max?: number
}
export interface SocketRange extends NumericRange {
    colors?: Partial<Record<'r' | 'g' | 'b' | 'w', number>>
}
export type FilterValue = NumericRange | SocketRange | 'yes' | 'no' | 'any' | null
