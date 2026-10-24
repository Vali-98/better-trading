import { bookmarkUrl } from '../../../integrations/poe-trade/navigation'
import { BookmarkLiveAction } from '../../liveSearch/BookmarkLiveAction'
import { DragHandle, SortableItem, SortableList } from '../../../components/Sortable'
import { Icon } from '../../../components/Icon'
import { type Trade } from '../../../lib/bookmarks/storage'

export function TradeList({
    trades,
    onMove,
    onComplete,
    onEdit,
    onCopy,
    onLocation,
    onMoveUp,
    onDelete,
}: {
    trades: Trade[]
    onMove: (from: number, to: number) => void
    onComplete: (trade: Trade) => void
    onEdit: (trade: Trade) => void
    onCopy: (trade: Trade) => void
    onLocation: (trade: Trade) => void
    onMoveUp: (trade: Trade) => void
    onDelete: (trade: Trade) => void
}) {
    return (
        <SortableList ids={trades.map((trade) => trade.id)} onMove={onMove}>
            {trades.map((trade) => (
                <SortableItem key={trade.id} id={trade.id} className="bt-trade-row">
                    <a className="flex-1 underline" href={bookmarkUrl(trade)}>
                        {trade.completedAt && (
                            <span className="bt-completed" aria-label="Completed">
                                ✓{' '}
                            </span>
                        )}
                        {trade.title}
                    </a>
                    <details className="bt-menu">
                        <summary aria-label={'Actions for ' + trade.title}>
                            <Icon name="options" />
                        </summary>
                        <div>
                            <button onClick={() => onComplete(trade)}>
                                {trade.completedAt ? 'Uncomplete trade' : 'Complete trade'}
                            </button>
                            <button onClick={() => onEdit(trade)}>Edit trade</button>
                            <button onClick={() => onCopy(trade)}>Copy trade URL</button>
                            {trade.location.type === 'search' && (
                                <>
                                    <a href={bookmarkUrl(trade, { live: true })}>
                                        Open live search
                                    </a>
                                    <BookmarkLiveAction trades={[trade]} />
                                </>
                            )}
                            <button onClick={() => onLocation(trade)}>Update trade location</button>
                            <button onClick={() => onMoveUp(trade)}>Move up</button>
                            <button onClick={() => onDelete(trade)}>Delete trade</button>
                        </div>
                    </details>
                    <DragHandle label={'Drag ' + trade.title + ' to reorder'}>
                        <Icon name="sort" />
                    </DragHandle>
                </SortableItem>
            ))}
        </SortableList>
    )
}
