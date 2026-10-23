import { create } from 'zustand'

export const enhancerIds = ['equivalent-pricings', 'highlight-stat-filters'] as const
// Hidden and disabled by default: less useful in modern PoE.
// 'maximum-sockets',
// 'regroup-similars',
export const searchEnhancementIds = ['coloured-meta-tags', 'default-stat-filter-tilde'] as const

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
