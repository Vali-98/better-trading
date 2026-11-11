import { tradeUrl } from '../integrations/poe-trade/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getHistory } from '../lib/history'
import { setValue } from '../lib/storage'
export function HistoryPanel() {
    const client = useQueryClient()
    const history = useQuery({ queryKey: ['history'], queryFn: getHistory })
    const clear = useMutation({
        mutationFn: () => setValue('trade-history', []),
        onSuccess: () => client.invalidateQueries({ queryKey: ['history'] }),
    })
    return (
        <section>
            {history.isPending ? (
                <p>Loading history…</p>
            ) : history.error ? (
                <p role="alert">Unable to load history.</p>
            ) : !history.data?.length ? (
                <p>No searches in your history yet.</p>
            ) : (
                <>
                    <ul>
                        {history.data.map((entry) => (
                            <li key={entry.id}>
                                <a className="bt-history-link" href={tradeUrl(entry)}>
                                    {entry.title || entry.slug}
                                    <small>
                                        {entry.league} ·{' '}
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </small>
                                </a>
                            </li>
                        ))}
                    </ul>
                    <button
                        className="bt-button"
                        onClick={() => clear.mutate()}
                        disabled={clear.isPending}>
                        Clear history
                    </button>
                </>
            )}
            {clear.error && <p role="alert">Unable to clear history.</p>}
        </section>
    )
}
