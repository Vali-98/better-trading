import { bookmarkUrl } from '../../integrations/poe-trade/navigation'
import { useState } from 'react'
import { browser } from 'wxt/browser'
import { type Trade } from '../../lib/bookmarks/storage'
import { parseLiveSearch } from '../../integrations/poe-trade/live/protocol'
import { useLiveSearchTargets } from './useLiveSearchTargets'

export function BookmarkLiveAction({
    trades,
    folder = false,
}: {
    trades: Trade[]
    folder?: boolean
}) {
    const { enabled, targets } = useLiveSearchTargets()
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const searches = trades
        .filter((trade) => trade.location.type === 'search')
        .flatMap((trade) => {
            try {
                const url = bookmarkUrl(trade)
                return url ? [parseLiveSearch(url, trade.title)] : []
            } catch {
                return []
            }
        })
    const compatible = targets.filter((tab) => searches.length && tab.scope === searches[0].scope)
    if (!enabled || (!folder && (!searches.length || !compatible.length))) return null
    const add = async (target?: number) => {
        if (busy) return
        setBusy(true)
        setMessage('Adding searches…')
        try {
            const response = await browser.runtime.sendMessage({
                query: 'live-search-bookmarks',
                items: searches.map(({ url, label }) => ({ url, label })),
                target,
                create: folder,
            })
            setMessage(
                response?.ok && response.total === 1
                    ? ''
                    : response?.message || 'Could not add searches.'
            )
        } catch {
            setMessage('Could not reach the Live Search tab.')
        } finally {
            setBusy(false)
        }
    }
    return (
        <>
            <button
                className="bt-live-add-label"
                disabled={busy || !searches.length || compatible.length > 1}
                title={
                    folder
                        ? `${searches.length} trade searches; exchange bookmarks are excluded.`
                        : undefined
                }
                onClick={() => void add(compatible[0]?.id)}>
                Add to live search
            </button>
            {compatible.length > 1 && (
                <div className="bt-live-targets" role="group" aria-label="Active Live Search tabs">
                    {compatible.map((tab) => (
                        <button
                            key={tab.id}
                            disabled={busy}
                            title={tab.label}
                            onClick={() => void add(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}
            {message && (
                <p className="bt-live-add-status" role="status">
                    {message}
                </p>
            )}
        </>
    )
}
