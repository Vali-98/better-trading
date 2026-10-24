export interface LiveSearch {
    url: string
    socket: string
    scope: string
    key: string
    label: string
}
export interface LiveSubscription {
    key: string
    label: string
    enabled: boolean
    status: 'connecting' | 'active' | 'paused' | 'error'
    message?: string
}
export interface LiveState {
    native?: LiveSearch
    subscriptions: LiveSubscription[]
    message?: string
}
export interface LiveTarget {
    id: number
    label: string
    scope: string
}
export interface BookmarkLiveSearch {
    url: string
    label: string
}
