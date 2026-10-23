import { Dialog } from '../../../components/Dialog'
import { Icon } from '../../../components/Icon'
import type { Folder } from '../../../lib/bookmarks/storage'
import { folderIcons, iconUrl } from '../bookmarkUtils'

export function FolderEditorDialog({
    folder,
    saving,
    isExisting,
    onChange,
    onSave,
    onClose,
}: {
    folder: Folder
    saving: boolean
    isExisting: boolean
    onChange: (folder: Folder) => void
    onSave: () => void
    onClose: () => void
}) {
    return (
        <Dialog title={isExisting ? 'Edit folder' : 'Create folder'} close={onClose}>
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
                        value={folder.title}
                        onChange={(event) => onChange({ ...folder, title: event.target.value })}
                    />
                </label>
                <fieldset className="bt-icon-picker">
                    <legend>Icon</legend>
                    {[true, false].map((items) => (
                        <div
                            key={String(items)}
                            role="group"
                            aria-label={items ? 'Currency and item icons' : 'Character icons'}
                            className={`bt-icon-grid ${items ? 'bt-item-icon-grid' : 'bt-character-icon-grid'}`}>
                            {items && (
                                <button
                                    type="button"
                                    className="bt-icon-option"
                                    aria-label="No icon"
                                    aria-pressed={!folder.icon}
                                    onClick={() => onChange({ ...folder, icon: null })}>
                                    <Icon name="close" />
                                </button>
                            )}
                            {folderIcons(folder.version, items).map((icon) => (
                                <button
                                    type="button"
                                    className="bt-icon-option"
                                    key={icon}
                                    aria-label={icon.replaceAll('-', ' ')}
                                    title={icon.replaceAll('-', ' ')}
                                    aria-pressed={folder.icon === icon}
                                    onClick={() => onChange({ ...folder, icon })}>
                                    <img src={iconUrl(icon)} alt="" />
                                </button>
                            ))}
                        </div>
                    ))}
                </fieldset>
                <button className="bt-button" disabled={saving}>
                    Save folder
                </button>
            </form>
        </Dialog>
    )
}
