import type { ReactNode } from 'react'

export function Tag({
    children,
    theme,
    title,
}: {
    children: ReactNode
    theme?: string
    title?: string
}) {
    return (
        <span className="bt-tag" data-bt-meta-tag-theme={theme} title={title} aria-label={title}>
            {children}
        </span>
    )
}
