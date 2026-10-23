import { browser } from 'wxt/browser'
import { Icon } from '../../components/Icon'

const logo = browser.runtime.getURL('/assets/images/logo.png')

export function PanelHeader({
    collapsed,
    about,
    onToggleCollapsed,
    onCloseAbout,
    onToggleAbout,
}: {
    collapsed: boolean
    about: boolean
    onToggleCollapsed: () => void
    onCloseAbout: () => void
    onToggleAbout: () => void
}) {
    return (
        <>
            <button
                className={`bt-expand ${collapsed ? 'visible' : ''}`}
                onClick={onToggleCollapsed}
                aria-label="Expand Better Trading">
                ‹ <img src={logo} alt="" />
            </button>
            <header className="bt-header">
                <button
                    className="bt-header-button"
                    onClick={onToggleCollapsed}
                    aria-label="Collapse Better Trading">
                    ›
                </button>
                <button className="bt-brand" onClick={onCloseAbout}>
                    <img src={logo} alt="" />
                    <span>Better Trading</span>
                </button>
                <button
                    className="bt-header-button"
                    onClick={onToggleAbout}
                    aria-label={about ? 'Close about' : 'About Better Trading'}>
                    <Icon name={about ? 'close' : 'info'} />
                </button>
            </header>
        </>
    )
}
