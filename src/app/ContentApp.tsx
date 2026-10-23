import { useEffect, useState } from 'react'
import { FlashMessages } from '../components/FlashMessages'
import { BookmarksPanel } from '../features/bookmarks/BookmarksPanel'
import { Changelog } from '../features/Changelog'
import { HistoryPanel } from '../features/HistoryPanel'
import { AboutPanel } from '../features/panel/AboutPanel'
import { PanelHeader } from '../features/panel/PanelHeader'
import { PanelNavigation } from '../features/panel/PanelNavigation'
import { PinnedPanel } from '../features/PinnedPanel'
import { usePanelStore } from '../stores/panel'

export function ContentApp() {
    const { page, collapsed, setPage, toggleCollapsed } = usePanelStore()
    const [about, setAbout] = useState(false)
    useEffect(() => {
        const previous = document.body.style.paddingRight
        document.body.style.paddingRight = collapsed ? '0px' : '400px'
        return () => {
            document.body.style.paddingRight = previous
        }
    }, [collapsed])
    return (
        <>
            <aside
                aria-label="Better Trading"
                className={`bt-panel ${collapsed ? 'collapsed' : ''}`}>
                <PanelHeader
                    collapsed={collapsed}
                    about={about}
                    onToggleCollapsed={toggleCollapsed}
                    onCloseAbout={() => setAbout(false)}
                    onToggleAbout={() => setAbout(!about)}
                />
                {!collapsed && (
                    <>
                        <Changelog />
                        {!about && (
                            <PanelNavigation
                                page={page}
                                onSelect={(nextPage) => {
                                    setPage(nextPage)
                                    setAbout(false)
                                }}
                            />
                        )}
                        {about ? <AboutPanel /> : <CurrentPanel page={page} />}
                    </>
                )}
                <FlashMessages />
            </aside>
        </>
    )
}

function CurrentPanel({ page }: { page: ReturnType<typeof usePanelStore.getState>['page'] }) {
    if (page === 'bookmarks') return <BookmarksPanel />
    if (page === 'history') return <HistoryPanel />
    return <PinnedPanel />
}
