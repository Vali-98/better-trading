import { create } from 'zustand'

export const enhancerIds = [
    'equivalent-pricings',
    'highlight-stat-filters',
    'item-reference-links',
    'unique-price-sparklines',
    'merged-live-searches',
] as const
// Hidden and disabled by default: less useful in modern PoE.
// 'maximum-sockets',
// 'regroup-similars',
export const searchEnhancementIds = [
    'search-history',
    'coloured-meta-tags',
    'search-filter-shortcuts',
    'focus-item-search',
    'focus-stat-search',
    'default-stat-filter-tilde',
    'default-search-filter-tilde',
] as const

// Preserve opt-in defaults when introducing settings to existing installations.
function initializeOptIn(flag: string, feature: string) {
    if (localStorage.getItem(flag)) return
    const saved = localStorage.getItem('bt-disabled-settings')
    if (saved !== null)
        localStorage.setItem(
            'bt-disabled-settings',
            [...new Set([...saved.split(',').filter(Boolean), feature])].join(',')
        )
    localStorage.setItem(flag, 'true')
}

initializeOptIn('bt-unique-sparklines-initialized', 'unique-price-sparklines')
initializeOptIn('bt-live-merge-initialized', 'merged-live-searches')
initializeOptIn('bt-search-tilde-initialized', 'default-search-filter-tilde')

export type SearchEnhancementId = (typeof searchEnhancementIds)[number]

export const useSettingsStore = create<{
    disabled: string[]
    toggle: (id: string) => void
}>((set) => ({
    disabled: localStorage.getItem('bt-disabled-settings')?.split(',').filter(Boolean) ?? [
        ...new Set([
            ...(localStorage.getItem('bt-disabled-enhancers') ?? '').split(',').filter(Boolean),
            'unique-price-sparklines',
            'merged-live-searches',
            'maximum-sockets',
            'regroup-similars',
            'default-search-filter-tilde',
            ...(
                localStorage.getItem('bt-disabled-search-enhancements') ??
                'default-stat-filter-tilde'
            )
                .split(',')
                .filter(Boolean),
        ]),
    ],
    toggle: (id) =>
        set((state) => {
            const disabled = state.disabled.includes(id)
                ? state.disabled.filter((value) => value !== id)
                : [...state.disabled, id]
            localStorage.setItem('bt-disabled-settings', disabled.join(','))
            return { disabled }
        }),
}))

// Settings are shared by trade tabs; live subscriptions must stop in every tab
// when their enhancer is disabled elsewhere.
if (typeof window !== 'undefined')
    window.addEventListener('storage', (event) => {
        if (event.key === 'bt-disabled-settings' && event.newValue !== null)
            useSettingsStore.setState({ disabled: event.newValue.split(',').filter(Boolean) })
    })
