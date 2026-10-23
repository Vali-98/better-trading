import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { downloadBackup, readBackupFile } from '../../lib/bookmarks/fileTransfer'
import { Dialog } from '../../components/Dialog'
import { useBackupRestore } from './hooks/useBackupRestore'

export function BackupControls({
    importing,
    closeImport,
}: {
    importing: boolean
    closeImport: () => void
}) {
    const fileInput = useRef<HTMLInputElement>(null)
    const [code, setCode] = useState('')
    const { busy, error, setError, restore } = useBackupRestore(() => {
        closeImport()
        setCode('')
    })
    return (
        <div className="bt-backup-tools">
            <span className="bt-backup-title">Backup Tools</span>
            {importing && (
                <Dialog title="Import folder" close={closeImport}>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            void restore(code, false)
                        }}>
                        <label>
                            Paste exported folder
                            <textarea
                                required
                                autoFocus
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                            />
                        </label>
                        <button className="bt-button" disabled={busy}>
                            Import folder
                        </button>
                        {error && <p role="alert">{error}</p>}
                    </form>
                </Dialog>
            )}
            <button
                className="bt-backup-action"
                disabled={busy}
                onClick={async () => {
                    try {
                        await downloadBackup()
                    } catch {
                        setError('Unable to generate backup.')
                    }
                }}>
                <span className="bt-backup-icon">
                    <Icon name="export" />
                </span>{' '}
                Save File
            </button>
            <button
                type="button"
                className="bt-backup-action"
                disabled={busy}
                onClick={() => fileInput.current?.click()}>
                <span className="bt-backup-icon">
                    <Icon name="import" />
                </span>{' '}
                Restore from File
            </button>
            <input
                ref={fileInput}
                hidden
                aria-label="Restore backup from file"
                type="file"
                accept=".txt,text/plain"
                disabled={busy}
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file)
                        void readBackupFile(file)
                            .then((text) => restore(text, true))
                            .catch(() => setError('Unable to read backup.'))
                    event.target.value = ''
                }}
            />
            {error && <p role="alert">{error}</p>}
        </div>
    )
}
