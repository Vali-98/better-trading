export function addItemLinks(
    row: HTMLElement,
    version: '1' | '2',
    add: (node: HTMLElement, parent: Element) => void
) {
    const header = row.querySelector('.itemHeader,.item-popup__header')
    if (!header) return
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
    const term = (cleanName?.textContent ?? cleanHeader.textContent ?? '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    if (!term) return
    const links = document.createElement('span')
    links.className = 'bt-item-links'
    links.style.cssText =
        'display:block;position:relative;z-index:2;clear:both;text-align:center;font-size:11px;font-weight:normal;line-height:1.6;pointer-events:auto'
    const wiki = version === '2' ? 'www.poe2wiki.net' : 'www.poewiki.net'
    const db = version === '2' ? 'poe2db.tw' : 'poedb.tw'
    for (const [label, base, parameter] of [
        ['Wiki', `https://${wiki}/wiki/Special:Search`, 'search'],
        [
            'PoEDB',
            `https://${db}/us/${encodeURIComponent(term.replace(/['’]/g, '').replace(/\s+/g, '_'))}`,
            '',
        ],
    ]) {
        const url = new URL(base)
        if (parameter) url.searchParams.set(parameter, term)
        const link = document.createElement('a')
        link.textContent = label
        link.href = url.href
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.title = `Search ${label} for ${term}`
        link.style.cssText =
            'display:inline-block;position:relative;margin:2px 3px;padding:3px 8px;color:#d7bb70;pointer-events:auto'
        link.addEventListener('click', (event) => event.stopPropagation())
        links.append(link)
    }
    add(links, header.parentElement ?? header)
}
