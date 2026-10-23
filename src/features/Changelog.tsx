import { useState } from 'react'
import { ReleaseNotes } from '../components/ReleaseNotes'
import { Dialog } from '../components/Dialog'
import { currentRelease, releases } from '../lib/releases'
import { isDismissed, normalizeDismissed } from '../lib/releases/model'

export function Changelog() {
    const [dismissed, setDismissed] = useState(() => {
        const value = localStorage.getItem('bt-dismissed-changelog')
        const dismissed = isDismissed(value, currentRelease, releases)
        const normalized = normalizeDismissed(value, releases)
        if (normalized && normalized !== value)
            localStorage.setItem('bt-dismissed-changelog', normalized)
        return dismissed
    })
    const [open, setOpen] = useState(false)
    if (dismissed) return null
    return (
        <>
            <div className="bt-notice">
                Better Trading v{currentRelease.version} has been updated.{' '}
                <button onClick={() => setOpen(true)}>View changelog</button>
            </div>
            {open && (
                <Dialog
                    title={`What's new — v${currentRelease.version}`}
                    close={() => setOpen(false)}>
                    <ReleaseNotes markdown={currentRelease.markdown} />
                    <button
                        className="bt-button"
                        onClick={() => {
                            localStorage.setItem('bt-dismissed-changelog', currentRelease.version)
                            setDismissed(true)
                        }}>
                        Dismiss
                    </button>
                </Dialog>
            )}
        </>
    )
}
export function ReleaseHistory() {
    return (
        <div className="bt-info-box">
            <h2>What's new — v{currentRelease.version}</h2>
            <ReleaseNotes markdown={currentRelease.markdown} />
        </div>
    )
}
