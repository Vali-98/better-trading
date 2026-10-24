// Fallback approach and regression fixture: exile-center/better-trading PR #191.
// https://github.com/exile-center/better-trading/pull/191
const modifiers = [
    ['.item-mod--enchant,.enchantMod', 'enchant'],
    ['.item-mod--rune,.runeMod', 'rune'],
    ['.item-mod--implicit,.implicitMod', 'implicit'],
    ['.item-mod--fractured,.fracturedMod', 'fractured'],
    ['.item-mod--crafted,.craftedMod', 'crafted'],
    ['.item-mod--desecrated,.desecratedMod', 'desecrated'],
    ['.item-mod--mutated,.mutatedMod', 'vaal'],
] as const
const modSelector = '.item-mod,.explicitMod,' + modifiers.map(([selector]) => selector).join(',')
const propertySelector = '.item-popup__property,.property,.displayProperty'
const requirementsSelector = '.item-popup__property--requirements,.requirements'
const classes: Record<string, string> = {
    Belt: 'Belts',
    Amulet: 'Amulets',
    Ring: 'Rings',
    'Body Armour': 'Body Armours',
    Bow: 'Bows',
    Crossbow: 'Crossbows',
    Helmet: 'Helmets',
    Gloves: 'Gloves',
    Boots: 'Boots',
    Shield: 'Shields',
    Buckler: 'Bucklers',
    Focus: 'Foci',
    Staff: 'Staves',
    Quarterstaff: 'Quarterstaves',
    Wand: 'Wands',
    Sceptre: 'Sceptres',
    Spear: 'Spears',
    'One Hand Sword': 'One Hand Swords',
    'Two Hand Sword': 'Two Hand Swords',
    'One Hand Axe': 'One Hand Axes',
    'Two Hand Axe': 'Two Hand Axes',
    'One Hand Mace': 'One Hand Maces',
    'Two Hand Mace': 'Two Hand Maces',
    Jewel: 'Jewels',
    Charm: 'Charms',
    Quiver: 'Quivers',
    Dagger: 'Daggers',
    'Life Flask': 'Life Flasks',
    'Mana Flask': 'Mana Flasks',
    Relic: 'Relics',
    Waystone: 'Waystones',
}
function text(node: Element) {
    const clone = node.cloneNode(true) as Element
    clone.querySelectorAll('.lc.l,.lc.r,.bt-item-links').forEach((child) => child.remove())
    clone.querySelectorAll('br').forEach((child) => child.replaceWith('\n'))
    return (clone.textContent ?? '')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
}
export function readItemText(row: HTMLElement): string | null {
    const popup = row.querySelector('.middle .item-popup,.middle .itemPopupContainer')
    const content = popup?.querySelector('.item-popup__content,.content')
    const names =
        popup &&
        Array.from(popup.querySelectorAll('.item-popup__header-line,.itemHeader .itemName'))
            .map(text)
            .filter(Boolean)
    if (!popup || !content || !names?.length) return null
    const rarity = ['Normal', 'Magic', 'Rare', 'Unique', 'Gem', 'Currency'].find((value) =>
        popup.matches(
            `.item-popup--${value.toLowerCase()},.${value.toLowerCase()}Popup,.item-popup--runic-${value.toLowerCase()}`
        )
    )
    if (!rarity) return null
    const itemClass = popup.querySelector('.item-popup__property > .lc[type]:not([data-field])')
    const header = [
        ...(itemClass ? [`Item Class: ${classes[text(itemClass)] ?? text(itemClass)}`] : []),
        `Rarity: ${rarity}`,
        ...names,
    ].join('\n')
    const properties: string[] = [],
        requirements: string[] = [],
        levels: string[] = [],
        sections: string[] = [],
        notes: string[] = []
    let current: string[] = []
    const flush = () => {
        if (current.length) sections.push(current.join('\n'))
        current = []
    }
    const visit = (parent: Element) => {
        for (const node of Array.from(parent.children)) {
            if (node.matches('.item-popup__separator,.separator')) {
                flush()
                continue
            }
            if (node.querySelector('.lc[type]:not([data-field])')) continue
            if (node.matches(requirementsSelector)) {
                const values = [
                    ['lvl', 'Level'],
                    ['str', 'Str'],
                    ['dex', 'Dex'],
                    ['int', 'Int'],
                ].flatMap(([field, label]) => {
                    const value = node.querySelector(`[data-field="${field}"]`)
                    const number = value && text(value).match(/\d+/)?.[0]
                    return number ? [`${label}: ${number}`] : []
                })
                requirements.push(
                    values.length ? ['Requirements:', ...values].join('\n') : text(node)
                )
                continue
            }
            if (node.matches('.itemLevel') || node.querySelector('[data-field="ilvl"]')) {
                levels.push(text(node))
                continue
            }
            if (node.matches(modSelector)) {
                const suffix = modifiers.find(([selector]) => node.matches(selector))?.[1]
                const value = text(node.querySelector('.s') ?? node)
                if (value)
                    current.push(
                        value
                            .split('\n')
                            .map((line) => (suffix ? `${line} (${suffix})` : line))
                            .join('\n')
                    )
                continue
            }
            if (node.matches(propertySelector)) {
                const augmented = node.querySelector(
                    '.colourAugmented,[style*="colour-value-augmented"],[style*="colour-augmented"]'
                )
                properties.push(text(node) + (augmented ? ' (augmented)' : ''))
                continue
            }
            if (
                node.querySelector(
                    `${modSelector},${propertySelector},${requirementsSelector},.itemLevel`
                )
            ) {
                visit(node)
                continue
            }
            const value = text(node)
            if (/^~(?:b\/o|price)\s/.test(value) || node.matches('.itemNote'))
                notes.push(`Note: ${value}`)
            else if (value) current.push(value)
        }
    }
    visit(content)
    flush()
    const sockets = row.querySelectorAll('.left .sockets .socket').length
    return [
        header,
        properties.join('\n'),
        requirements.join('\n'),
        sockets ? `Sockets: ${Array(sockets).fill('S').join(' ')}` : '',
        levels.join('\n'),
        ...sections,
        notes.join('\n'),
    ]
        .filter(Boolean)
        .join('\n--------\n')
}
