import { Dialog } from '../../../components/Dialog'
import type { Trade } from '../../../lib/bookmarks/storage'

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
    onSave: () => void
    onClose: () => void
}) {
    return (
        <Dialog title="Save trade" close={onClose}>
            <form
                onSubmit={(event) => {
                    event.preventDefault()
                    onSave()
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
                <button className="bt-button" disabled={saving}>
                    Save trade
                </button>
            </form>
        </Dialog>
    )
}
