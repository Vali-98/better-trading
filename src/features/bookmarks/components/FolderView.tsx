import { useState } from 'react'
import { Collapsible } from '../../../components/Collapsible'
import { Dialog } from '../../../components/Dialog'
import { serialize } from '../../../lib/bookmarks/export'
import { currentLocation, tradeUrl, type Folder, type Trade } from '../../../lib/bookmarks/storage'
import { recommendTitle } from '../../../lib/searchPanel'
import { reordered } from '../bookmarkUtils'
import { useFolderTrades } from '../hooks/useFolderTrades'
import { FolderHeader } from './FolderHeader'
import { TradeEditorDialog } from './TradeEditorDialog'
import { TradeList } from './TradeList'

type Props = {
    folder: Folder
    expanded: boolean
    toggle: () => void
    edit: () => void
    archive: () => void
    remove: () => Promise<void>
}

export function FolderView({ folder, expanded, toggle, edit, archive, remove }: Props) {
    const [deleteFolder, setDeleteFolder] = useState(false)
    const [draft, setDraft] = useState<Trade | null>(null)
    const [deleting, setDeleting] = useState<Trade | null>(null)
    const [exported, setExported] = useState<string | null>(null)
    const [error, setError] = useState('')
    const { client, queryKey, trades, mutation, reorderMutation } = useFolderTrades(folder.id)
    const items = trades.data ?? []
    const save = (next: Trade[], onSuccess?: () => void) => mutation.mutate(next, { onSuccess })
    const update = (trade: Trade, change: Partial<Trade>) =>
        save(items.map((item) => (item.id === trade.id ? { ...item, ...change } : item)))
    const updateLocation = (trade: Trade) => {
        const { league: _, ...location } = currentLocation()
        if (location.slug) update(trade, { location })
    }
    const moveUp = (trade: Trade) => {
        const next = [...items]
        const index = next.indexOf(trade)
        if (index > 0) {
            ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
            save(next)
        }
    }
    const register = () => {
        const { league: _, ...location } = currentLocation()
        if (!location.slug) return setError('Run a trade search before registering it.')
        setDraft({ id: crypto.randomUUID(), title: recommendTitle(), location, completedAt: null })
    }
    return (
        <div className="bt-folder">
            <FolderHeader
                folder={folder}
                expanded={expanded}
                onToggle={toggle}
                onEdit={edit}
                onArchive={archive}
                onDelete={() => setDeleteFolder(true)}
                onExport={() => setExported(serialize(folder, items))}
                canExport={Boolean(trades.data)}
            />
            <Collapsible open={expanded && !folder.archivedAt}>
                <div className="bt-folder-body">
                    <TradeList
                        trades={items}
                        onMove={(from, to) => {
                            const next = reordered(items, from, to)
                            client.setQueryData(queryKey, next)
                            reorderMutation.mutate(next)
                        }}
                        onComplete={(trade) =>
                            update(trade, {
                                completedAt: trade.completedAt ? null : new Date().toISOString(),
                            })
                        }
                        onEdit={(trade) => setDraft({ ...trade })}
                        onCopy={(trade) =>
                            void navigator.clipboard
                                .writeText(tradeUrl(trade))
                                .catch(() => setError('Unable to access clipboard.'))
                        }
                        onLocation={updateLocation}
                        onMoveUp={moveUp}
                        onDelete={setDeleting}
                    />
                    <button
                        className="bt-button bt-register-trade"
                        disabled={!trades.data || mutation.isPending}
                        onClick={register}>
                        Register Current Trade
                    </button>
                    {(trades.error || mutation.error) && (
                        <p role="alert">Unable to load or update this folder.</p>
                    )}
                    {error && <p role="alert">{error}</p>}
                    {draft && (
                        <TradeEditorDialog
                            trade={draft}
                            saving={mutation.isPending}
                            onChange={setDraft}
                            onSave={() =>
                                save(
                                    items.some((item) => item.id === draft.id)
                                        ? items.map((item) => (item.id === draft.id ? draft : item))
                                        : [...items, draft],
                                    () => setDraft(null)
                                )
                            }
                            onClose={() => setDraft(null)}
                        />
                    )}
                    {deleting && (
                        <Dialog title="Delete trade" close={() => setDeleting(null)}>
                            <p>Delete {deleting.title}?</p>
                            <button
                                className="bt-button"
                                onClick={() =>
                                    save(
                                        items.filter((item) => item.id !== deleting.id),
                                        () => setDeleting(null)
                                    )
                                }>
                                Delete
                            </button>
                        </Dialog>
                    )}
                </div>
            </Collapsible>
            {exported && (
                <Dialog title="Export folder" close={() => setExported(null)}>
                    <textarea
                        aria-label="Exported folder"
                        readOnly
                        value={exported}
                        onFocus={(event) => event.target.select()}
                    />
                </Dialog>
            )}
            {deleteFolder && (
                <Dialog title="Delete folder" close={() => setDeleteFolder(false)}>
                    <p>Delete {folder.title} and all its trades?</p>
                    <button
                        className="bt-button"
                        onClick={() =>
                            void remove().catch(() => setError('Unable to delete folder.'))
                        }>
                        Delete folder
                    </button>
                </Dialog>
            )}
        </div>
    )
}
