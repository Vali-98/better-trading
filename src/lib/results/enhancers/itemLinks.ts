import { readItemIdentity } from '../../../integrations/poe-trade/itemIdentity'
import { itemReferenceLinks } from '../../../integrations/item-references/links'
import type { ResultItem } from '../../../models/item'
export function addItemLinks(
    row: HTMLElement,
    version: '1' | '2',
    add: (node: HTMLElement, parent: Element) => void,
    item?: ResultItem
) {
    const identity = readItemIdentity(row, item)
    if (!identity) return
    const { header, term } = identity
    if (!term) return
    const links = document.createElement('span')
    links.className = 'bt-item-links'
    links.style.cssText =
        'display:block;clear:both;text-align:center;font-size:11px;font-weight:normal;line-height:1.6;pointer-events:none'
    for (const { label, url } of itemReferenceLinks(term, version)) {
        const link = document.createElement('a')
        link.textContent = label
        link.href = url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.title = `Search ${label} for ${term}`
        link.style.cssText =
            'display:inline-block;margin:2px 3px;padding:3px 8px;color:#d7bb70;pointer-events:auto'
        link.addEventListener('click', (event) => event.stopPropagation())
        links.append(link)
    }
    add(links, header.parentElement ?? header)
}
