import type { PanelPage } from '../../stores/panel'

const labels: Record<PanelPage, string> = {
    bookmarks: '▣ Bookmarks',
    'pinned-items': '⚑ Pinned items',
    history: '◷ History',
}

export function PanelNavigation({
    page,
    onSelect,
}: {
    page: PanelPage
    onSelect: (page: PanelPage) => void
}) {
    return (
        <nav aria-label="Panel sections" className="bt-tabs">
            {(Object.keys(labels) as PanelPage[]).map((item) => (
                <button key={item} aria-pressed={page === item} onClick={() => onSelect(item)}>
                    {labels[item]}
                </button>
            ))}
        </nav>
    )
}
