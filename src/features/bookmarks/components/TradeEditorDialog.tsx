import { Dialog } from '../../../components/Dialog'
import type { Trade } from '../../../lib/bookmarks/storage'
import { useState } from 'react'
import { parseBookmarkLink, savedBookmarkLink } from '../../../integrations/poe-trade/bookmarkLinks'

export function TradeEditorDialog({
    trade,
    saving,
    onChange,
    onSave,
    onClose,
}: {
    trade: Trade
    saving: boolean
    onChange: (trade: Trade) => void
    onSave: (trade: Trade) => void
    onClose: () => void
}) {
    const [link, setLink] = useState(() => savedBookmarkLink(trade))
    const [error, setError] = useState('')
    return (
        <Dialog title="Edit Trade" close={onClose}>
            <form
                onSubmit={(event) => {
                    event.preventDefault()
                    try {
                        const location = parseBookmarkLink(link)
                        if (location.version !== trade.location.version)
                            throw new Error('Use a URL for the same game as this folder.')
                        setError('')
                        onSave({ ...trade, location })
                    } catch (cause) {
                        setError(cause instanceof Error ? cause.message : 'Invalid trade URL.')
                    }
                }}>
                <label>
                    Title
                    <input
                        required
                        autoFocus
                        value={trade.title}
                        onChange={(event) => onChange({ ...trade, title: event.target.value })}
                    />
                </label>
                <label>
                    Trade link
                    <input
                        required
                        type="url"
                        value={link}
                        onChange={(event) => setLink(event.target.value)}
                    />
                </label>
                {error && <p role="alert">{error}</p>}
                <button className="bt-button" disabled={saving}>
                    Save trade
                </button>
            </form>
        </Dialog>
    )
}
