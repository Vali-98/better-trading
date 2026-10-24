import type { ResultItem } from '../../models/item'

export function readItemIdentity(row: HTMLElement, item?: ResultItem) {
    const header = row.querySelector('.itemHeader,.item-popup__header')
    if (!header) return undefined
    const unique = Boolean(
        header.matches('.unique,.item-popup__header--unique') ||
        header.querySelector('.unique') ||
        row.querySelector('.item-popup--unique,.itemRendered.unique')
    )
    const typeSelector = '.typeLine,.itemType,.item-popup__type,.item-popup__base-type'
    const headerLines = header.querySelectorAll('.item-popup__header-line')
    const name = headerLines.length
        ? headerLines[unique ? 0 : headerLines.length - 1]
        : unique
          ? header.querySelector('.itemName,.item-popup__name')
          : header.querySelector(typeSelector)
    const cleanHeader = header.cloneNode(true) as HTMLElement
    cleanHeader.querySelectorAll('.bt-item-links').forEach((node) => node.remove())
    const cleanName = name?.cloneNode(true) as HTMLElement | undefined
    if (unique) {
        cleanHeader.querySelectorAll(typeSelector).forEach((node) => node.remove())
        cleanName?.querySelectorAll(typeSelector).forEach((node) => node.remove())
    }
    const dataTerm =
        item && (item.frameType === 3 && item.name ? item.name : item.baseType || item.typeLine)
    const term = (dataTerm || cleanName?.textContent || cleanHeader.textContent || '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    return { header, term }
}
