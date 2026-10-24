import { useQuery } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import { useSettingsStore } from '../../stores/settings'
import type { LiveTarget } from '../../models/liveSearch'

// Only the bookmarks panel polls. Individual menus observe the same cached result.
export function useLiveSearchTargets(poll = false) {
    const enabled = !useSettingsStore((state) => state.disabled.includes('merged-live-searches'))
    const { data: targets = [] } = useQuery<LiveTarget[]>({
        queryKey: ['live-search', 'targets'],
        enabled,
        queryFn: async () => {
            const result = await browser.runtime.sendMessage({ query: 'live-search-targets' })
            return Array.isArray(result) ? result : []
        },
        refetchInterval: poll ? 3000 : false,
        staleTime: 2000,
        retry: false,
    })
    return { enabled, targets }
}
