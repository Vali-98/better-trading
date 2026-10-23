import { browser } from 'wxt/browser'

const itemIconOrder = [
    'alchemy',
    'chaos',
    'exalt',
    'divine',
    'mirror',
    'card',
    'essence',
    'fossil',
    'map',
    'scarab',
    'annul',
    'vaal',
    'regal',
    'transmute',
    'chance',
    'glassblower',
    'rune',
    'waystone',
    'wisdom',
]

const baseIcon = (icon: string) => icon.replace(/^poe2-/, '')

export const iconNames = Object.keys(
    import.meta.glob('../../../public/assets/images/bookmark-folder/*.png')
).map((path) => path.split('/').pop()!.replace('.png', ''))

export const iconUrl = (icon: string) =>
    new URL(
        `bookmark-folder/${encodeURIComponent(icon)}.png`,
        browser.runtime.getURL('/assets/images/logo.png')
    ).href

export function folderIcons(version: string, items: boolean) {
    return iconNames
        .filter((icon) => icon.startsWith('poe2-') === (version === '2'))
        .filter((icon) => itemIconOrder.includes(baseIcon(icon)) === items)
        .sort((a, b) =>
            items
                ? itemIconOrder.indexOf(baseIcon(a)) - itemIconOrder.indexOf(baseIcon(b))
                : a.localeCompare(b)
        )
}

export function reordered<T>(items: T[], from: number, to: number) {
    const result = [...items]
    const [item] = result.splice(from, 1)
    result.splice(to, 0, item)
    return result
}
