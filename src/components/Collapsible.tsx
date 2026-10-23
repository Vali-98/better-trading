import { useEffect, useState, type ReactNode } from 'react'

export function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
    const [settled, setSettled] = useState(open)
    useEffect(() => {
        setSettled(false)
        if (!open) return
        const timer = setTimeout(() => setSettled(true), 240)
        return () => clearTimeout(timer)
    }, [open])
    return (
        <div
            className={`bt-collapsible ${open ? 'is-open' : ''} ${open && settled ? 'is-settled' : ''}`}
            inert={!open}
            aria-hidden={!open}>
            <div className="bt-collapsible-inner">{children}</div>
        </div>
    )
}
