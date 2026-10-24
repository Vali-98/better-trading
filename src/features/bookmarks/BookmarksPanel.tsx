import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
import { Icon } from '../../components/Icon'
import { SortableItem, SortableList } from '../../components/Sortable'
import { currentLocation } from '../../integrations/poe-trade/location'
import { getFolders, saveFolders, type Folder } from '../../lib/bookmarks/storage'
import { bookmarkQueryKeys } from '../../lib/bookmarks/queryKeys'
import { BackupControls } from './BackupControls'
import { reordered } from './bookmarkUtils'
import { FolderEditorDialog } from './components/FolderEditorDialog'
import { FolderView } from './components/FolderView'
import { useExpandedFolders } from './hooks/useExpandedFolders'

export function BookmarksPanel() {
    const client = useQueryClient()
    const folders = useQuery({ queryKey: bookmarkQueryKeys.folders(), queryFn: getFolders })
    const [archived, setArchived] = useState(false)
    const [importing, setImporting] = useState(false)
    const [editing, setEditing] = useState<Folder | null>(null)
    const { expanded, setExpanded: expand, toggle } = useExpandedFolders()
    const mutation = useMutation({
        mutationFn: saveFolders,
        onMutate: async (items) => {
            await client.cancelQueries({ queryKey: bookmarkQueryKeys.folders() })
            client.setQueryData(bookmarkQueryKeys.folders(), items)
        },
        onError: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.folders() }),
        onSuccess: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.all }),
    })
    const reorderMutation = useMutation({
        mutationFn: saveFolders,
        meta: { silentSuccess: true },
        onSettled: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.folders() }),
    })
    const allFolders = folders.data ?? []
    const visibleFolders = allFolders.filter(
        (folder) =>
            folder.version === currentLocation().version && Boolean(folder.archivedAt) === archived
    )
    const saveEditing = () => {
        if (!editing) return
        const exists = allFolders.some((folder) => folder.id === editing.id)
        mutation.mutate(
            exists
                ? allFolders.map((folder) => (folder.id === editing.id ? editing : folder))
                : [...allFolders, editing],
            {
                onSuccess: () => {
                    expand([...expanded, editing.id])
                    setEditing(null)
                },
            }
        )
    }
    return (
        <section className="bt-bookmarks">
            <div className="bt-bookmark-toolbar">
                <button className="bt-button" onClick={() => expand([])}>
                    <Icon name="collapse" /> Collapse all
                </button>
                <button className="bt-button" onClick={() => setArchived(!archived)}>
                    <Icon name={archived ? 'undo' : 'archive'} />{' '}
                    {archived ? 'Show active' : 'Show archived'}
                </button>
            </div>
            {folders.isPending && <p role="status">Loading bookmarks…</p>}
            {(folders.error || mutation.error) && (
                <p role="alert">Unable to save or load bookmarks.</p>
            )}
            <div className="bt-folder-list">
                <SortableList
                    ids={visibleFolders.map((folder) => folder.id)}
                    onMove={(from, to) => {
                        const ordered = reordered(visibleFolders, from, to)
                        let index = 0
                        const updated = allFolders.map((folder) =>
                            visibleFolders.includes(folder) ? ordered[index++] : folder
                        )
                        client.setQueryData(bookmarkQueryKeys.folders(), updated)
                        reorderMutation.mutate(updated)
                    }}>
                    {visibleFolders.map((folder) => (
                        <SortableItem id={folder.id} key={folder.id} className="bt-folder-wrapper">
                            <FolderView
                                folder={folder}
                                expanded={expanded.includes(folder.id)}
                                onToggle={() => toggle(folder.id)}
                                onEdit={() => setEditing({ ...folder })}
                                onArchive={() =>
                                    mutation.mutate([
                                        ...allFolders.filter((item) => item.id !== folder.id),
                                        {
                                            ...folder,
                                            archivedAt: folder.archivedAt
                                                ? null
                                                : new Date().toISOString(),
                                        },
                                    ])
                                }
                                onRemove={async () => {
                                    await browser.storage.local.remove(
                                        `bookmark-trades--${folder.id}`
                                    )
                                    mutation.mutate(
                                        allFolders.filter((item) => item.id !== folder.id)
                                    )
                                }}
                            />
                        </SortableItem>
                    ))}
                </SortableList>
            </div>
            {!archived && (
                <div className="bt-folder-create-actions">
                    <button
                        className="bt-button"
                        disabled={!folders.data}
                        onClick={() =>
                            setEditing({
                                id: crypto.randomUUID(),
                                title: '',
                                version: currentLocation().version,
                                icon: null,
                                archivedAt: null,
                            })
                        }>
                        <Icon name="new-folder" /> New folder
                    </button>
                    <button className="bt-button" onClick={() => setImporting(true)}>
                        <Icon name="import-folder" /> Import folder
                    </button>
                </div>
            )}
            {editing && (
                <FolderEditorDialog
                    folder={editing}
                    saving={mutation.isPending}
                    isExisting={allFolders.some((folder) => folder.id === editing.id)}
                    onChange={setEditing}
                    onSave={saveEditing}
                    onClose={() => setEditing(null)}
                />
            )}
            <BackupControls importing={importing} closeImport={() => setImporting(false)} />
        </section>
    )
}
