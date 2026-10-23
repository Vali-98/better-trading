// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { addItemLinks } from './itemLinks'

it('searches only the unique name from a double-line item header', () => {
    const row = document.createElement('div')
    row.innerHTML = `<div class="item-popup item-popup--unique"><div class="item-popup__header item-popup__header--unique"><div class="item-popup__header-line">Emperor's Might</div><div class="item-popup__header-line">Crimson Jewel</div></div></div>`
    addItemLinks(row, '1', (node, parent) => parent.append(node))
    const links = row.querySelectorAll<HTMLAnchorElement>('.bt-item-links a')
    expect(new URL(links[0].href).searchParams.get('search')).toBe("Emperor's Might")
    expect(links[1].href).toBe('https://poedb.tw/us/Emperors_Might')
})
