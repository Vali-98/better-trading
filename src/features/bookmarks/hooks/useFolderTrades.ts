import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTrades, saveTrades, type Trade } from '../../../lib/bookmarks/storage'
import { bookmarkQueryKeys } from '../../../lib/bookmarks/queryKeys'

export function useFolderTrades(folderId: string) {
    const client = useQueryClient()
    const queryKey = bookmarkQueryKeys.trades(folderId)
    const trades = useQuery({ queryKey, queryFn: () => getTrades(folderId) })
    const mutation = useMutation({
        mutationFn: (items: Trade[]) => saveTrades(folderId, items),
        onMutate: async (items) => {
            await client.cancelQueries({ queryKey })
            client.setQueryData(queryKey, items)
        },
        onError: () => client.invalidateQueries({ queryKey }),
        onSuccess: () => client.invalidateQueries({ queryKey }),
    })
    const reorderMutation = useMutation({
        mutationFn: (items: Trade[]) => saveTrades(folderId, items),
        meta: { silentSuccess: true },
        onSettled: () => client.invalidateQueries({ queryKey }),
    })
    return { trades, mutation, reorderMutation, queryKey, client }
}
