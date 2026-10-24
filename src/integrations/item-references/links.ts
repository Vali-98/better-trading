export function itemReferenceLinks(term: string, version: '1' | '2') {
    const wiki = version === '2' ? 'www.poe2wiki.net' : 'www.poewiki.net'
    const db = version === '2' ? 'poe2db.tw' : 'poedb.tw'
    const search = new URL(`https://${wiki}/wiki/Special:Search`)
    search.searchParams.set('search', term)
    const slug = encodeURIComponent(term.replace(/['’]/g, '').replace(/\s+/g, '_'))
    return [
        { label: 'Wiki', url: search.href },
        { label: 'PoEDB', url: `https://${db}/us/${slug}` },
    ]
}
