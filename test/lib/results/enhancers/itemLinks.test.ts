// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { addItemLinks } from '../../../../src/lib/results/enhancers/itemLinks'

it('searches only the unique name from a double-line item header', () => {
    const row = document.createElement('div')
    row.innerHTML = `<div class="item-popup item-popup--unique"><div class="item-popup__header item-popup__header--unique"><div class="item-popup__header-line">Emperor's Might</div><div class="item-popup__header-line">Crimson Jewel</div></div></div>`
    addItemLinks(row, '1', (node, parent) => parent.append(node))
    const links = row.querySelectorAll<HTMLAnchorElement>('.bt-item-links a')
    expect(new URL(links[0].href).searchParams.get('search')).toBe("Emperor's Might")
    expect(links[1].href).toBe('https://poedb.tw/us/Emperors_Might')
})

it.each([
    [
        {
            name: '',
            typeLine: 'Robust Sadist Garb of the Yeti',
            baseType: 'Sadist Garb',
            frameType: 1,
        },
        'Sadist Garb',
    ],
    [
        {
            name: 'Damnation Curtain',
            typeLine: 'Sadist Garb',
            baseType: 'Sadist Garb',
            frameType: 2,
        },
        'Sadist Garb',
    ],
    [
        { name: 'Mageblood', typeLine: 'Heavy Belt', baseType: 'Heavy Belt', frameType: 3 },
        'Mageblood',
    ],
    [
        {
            name: 'Foulborn Mageblood',
            typeLine: 'Heavy Belt',
            baseType: 'Heavy Belt',
            frameType: 3,
        },
        'Foulborn Mageblood',
    ],
])('prefers response item data over rendered names', (item, expected) => {
    const row = document.createElement('div')
    row.innerHTML =
        '<div class="itemHeader"><span class="typeLine">Wrong rendered name</span></div>'
    addItemLinks(row, '1', (node, parent) => parent.append(node), item)
    const link = row.querySelector<HTMLAnchorElement>('.bt-item-links a')!
    expect(new URL(link.href).searchParams.get('search')).toBe(expected)
})
