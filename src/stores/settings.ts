import { create } from 'zustand'

export const enhancerIds = [
    'equivalent-pricings',
    'highlight-stat-filters',
    'item-reference-links',
] as const
// Hidden and disabled by default: less useful in modern PoE.
// 'maximum-sockets',
// 'regroup-similars',
export const searchEnhancementIds = [
    'coloured-meta-tags',
    'default-stat-filter-tilde',
    'default-search-filter-tilde',
] as const

// Introduce the new opt-in without changing existing feature preferences.
if (!localStorage.getItem('bt-search-tilde-initialized')) {
    const saved = localStorage.getItem('bt-disabled-settings')
    if (saved !== null)
        localStorage.setItem(
            'bt-disabled-settings',
            [...new Set([...saved.split(',').filter(Boolean), 'default-search-filter-tilde'])].join(
                ','
            )
        )
    localStorage.setItem('bt-search-tilde-initialized', 'true')
}

export type SearchEnhancementId = (typeof searchEnhancementIds)[number]

export const useSettingsStore = create<{
    disabled: string[]
    toggle: (id: string) => void
}>((set) => ({
    disabled: localStorage.getItem('bt-disabled-settings')?.split(',').filter(Boolean) ?? [
        ...new Set([
            ...(localStorage.getItem('bt-disabled-enhancers') ?? '').split(',').filter(Boolean),
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
