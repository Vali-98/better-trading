import { useState } from 'react'
import { Dialog } from '../../../components/Dialog'
import type { Trade } from '../../../lib/bookmarks/storage'
import { overrideTradeLeague } from '../../../integrations/poe-trade/bookmarkLinks'
export function BulkTradeEditorDialog({
    trades,
    saving,
    error,
    onApply,
    onClose,
}: {
    trades: Trade[]
    saving: boolean
    error: string
    onApply: (trades: Trade[]) => void
    onClose: () => void
}) {
    const [league, setLeague] = useState('')
    const [validation, setValidation] = useState('')
    return (
        <Dialog title="Bulk edit trades" close={onClose}>
            <p>
                Update all {trades.length} saved links in this folder. Future league names are
                allowed.
            </p>
            <form
                className="bt-bulk-edit-row"
                onSubmit={(event) => {
                    event.preventDefault()
                    try {
                        const next = trades.map((trade) => overrideTradeLeague(trade, league))
                        setValidation('')
                        onApply(next)
                    } catch (cause) {
                        setValidation(cause instanceof Error ? cause.message : 'Invalid league.')
                    }
                }}>
                <label htmlFor="bt-bulk-league">Override League</label>
                <input
                    id="bt-bulk-league"
                    required
                    value={league}
                    onChange={(event) => setLeague(event.target.value)}
                    placeholder="League name"
                />
                <button className="bt-button" disabled={saving || !trades.length}>
                    Apply
                </button>
            </form>
            {(validation || error) && <p role="alert">{validation || error}</p>}
        </Dialog>
    )
}
