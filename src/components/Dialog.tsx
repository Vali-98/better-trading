import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import { browser } from 'wxt/browser'
export function Dialog({
    title,
    children,
    close,
}: {
    title: string
    children: ReactNode
    close: () => void
}) {
    const ref = useRef<HTMLDialogElement>(null)
    useEffect(() => {
        const dialog = ref.current!
        dialog.showModal()
        return () => dialog.close()
    }, [])
    return (
        <dialog
            ref={ref}
            className="bt-dialog"
            onCancel={(event) => {
                event.preventDefault()
                close()
            }}>
            <header>
                <h2>
                    <img
                        className="bt-dialog-logo"
                        src={browser.runtime.getURL('/assets/images/logo.png')}
                        alt=""
                    />
                    {title}
                </h2>
                <button
                    className="bt-dialog-close"
                    type="button"
                    aria-label="Close dialog"
                    onClick={close}>
                    <Icon name="close" />
                </button>
            </header>
            {children}
        </dialog>
    )
}
