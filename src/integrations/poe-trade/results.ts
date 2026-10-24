export function tradeRoot() {
    return document.querySelector('#trade')?.parentElement ?? document.body
}
export function resultRows(includeExchange = false) {
    return Array.from(
        document.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]')
    ).filter((row) => includeExchange || !row.classList.contains('exchange'))
}
export function hasResultRows() {
    return Boolean(document.querySelector('.resultset > div.row'))
}
export function isSearchElement(node: EventTarget | null) {
    return node instanceof Element && Boolean(node.closest('.search-advanced-pane'))
}
export function isModNode(node: Node) {
    const element = node instanceof Element ? node : node.parentElement
    return Boolean(element?.closest('.item-mod,.explicitMod,.implicitMod,.pseudoMod'))
}
export function pinButtonContainer(row: HTMLElement) {
    return row.querySelector('.details .btns')
}
export function readListingPrice(row: HTMLElement) {
    return {
        parent: row.querySelector('.price'),
        amount: parseFloat(
            row.querySelector('[data-field="price"] > br + span')?.textContent ?? ''
        ),
        currency: (row.querySelector('[data-field="price"] .currency-text span')?.textContent ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-'),
        icon: row.querySelector<HTMLImageElement>('[data-field="price"] .currency-image img'),
    }
}
export function readSocketDetails(row: HTMLElement) {
    return {
        level: Number(row.querySelector('.itemLevel')?.textContent?.match(/\d+/)?.[0]),
        sockets: row.querySelectorAll('.sockets .socket').length,
        bodyArmour: /\/BodyArmours\//.test(
            row.querySelector<HTMLImageElement>('.icon img')?.src ?? ''
        ),
        parent: row.querySelector('.itemRendered'),
    }
}
export function resultMods(row: HTMLElement) {
    return Array.from(
        row.querySelectorAll<HTMLElement>(
            '.explicitMod,.pseudoMod,.implicitMod,.item-mod--explicit,.item-mod--pseudo,.item-mod--implicit'
        )
    ).map((node) => ({
        node,
        text:
            node.querySelector<HTMLElement>('[data-field^="stat."]')?.textContent ??
            node.textContent ??
            '',
    }))
}
export function similarResultKey(row: HTMLElement) {
    return [
        row.querySelector('.profile-link [href]')?.getAttribute('href'),
        row.querySelector('.itemHeader')?.textContent?.replace(/superior/i, ''),
        row.querySelector('.price')?.textContent,
    ]
        .join('')
        .replace(/\s/g, '')
        .toLowerCase()
}
