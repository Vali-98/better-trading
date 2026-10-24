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
    'augment',
    'gemcutter',
]

const baseIcon = (icon: string) => icon.replace(/^poe2-/, '')

const icons = Object.keys(
    import.meta.glob(
        '../../../public/assets/images/bookmark-folder/poe{1,2}/{characters,items}/*.png'
    )
).map((path) => {
    const [game, group, file] = path.split('/').slice(-3)
    const name = file.replace(/\.png$/, '')
    return {
        id: game === 'poe2' ? `poe2-${name}` : name,
        version: game === 'poe2' ? '2' : '1',
        items: group === 'items',
        path: `${game}/${group}/${file}`,
    }
})
const iconFiles = new Map(icons.map((icon) => [icon.id, icon.path]))

// IDs remain unchanged so saved bookmarks and exports keep their icons.
export const iconNames = icons.map((icon) => icon.id)

export const iconUrl = (icon: string) => {
    const id = icon === 'raider' ? 'warden' : icon
    const path = iconFiles.get(id)
    return new URL(
        path ? `bookmark-folder/${path}` : 'logo.png',
        browser.runtime.getURL('/assets/images/logo.png')
    ).href
}

export function folderIcons(version: string, items: boolean) {
    return icons
        .filter((icon) => icon.version === (version === '2' ? '2' : '1') && icon.items === items)
        .map((icon) => icon.id)
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
