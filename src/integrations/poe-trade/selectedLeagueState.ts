import { create } from 'zustand'
export const useSelectedLeague = create<{
    league: string | undefined
    enabled: boolean
    version?: string
}>(() => ({ league: undefined, enabled: false }))
export function selectedLeagueOverride(version?: string) {
    const state = useSelectedLeague.getState()
    return state.enabled && (!version || version === state.version) ? state.league : undefined
}
