import { DragHandle } from '../../../components/Sortable'
import { Icon } from '../../../components/Icon'
import type { Folder } from '../../../lib/bookmarks/storage'
import { iconUrl } from '../bookmarkUtils'

export function FolderHeader({
    folder,
    expanded,
    onToggle,
    onEdit,
    onArchive,
    onDelete,
    onExport,
    canExport,
}: {
    folder: Folder
    expanded: boolean
    onToggle: () => void
    onEdit: () => void
    onArchive: () => void
    onDelete: () => void
    onExport: () => void
    canExport: boolean
}) {
    return (
        <header className="bt-folder-header">
            <button
                className="bt-folder-title"
                aria-expanded={expanded && !folder.archivedAt}
                onClick={onToggle}
                disabled={Boolean(folder.archivedAt)}>
                {folder.icon && <img src={iconUrl(folder.icon)} alt="" />}
                <span>{folder.title}</span>
                {!folder.archivedAt && (
                    <span className={'bt-expansion-arrow ' + (expanded ? 'is-expanded' : '')}>
                        <Icon name="chevron" />
                    </span>
                )}
            </button>
            <details className="bt-menu">
                <summary aria-label="Folder actions">
                    <Icon name="options" />
                </summary>
                <div>
                    {!folder.archivedAt && <button onClick={onEdit}>Edit folder</button>}
                    <button onClick={onArchive}>
                        {folder.archivedAt ? 'Restore folder' : 'Archive folder'}
                    </button>
                    {folder.archivedAt && <button onClick={onDelete}>Delete folder</button>}
                    <button disabled={!canExport} onClick={onExport}>
                        Export folder
                    </button>
                </div>
            </details>
            <DragHandle label="Drag folder to reorder">
                <Icon name="sort" />
            </DragHandle>
        </header>
    )
}
