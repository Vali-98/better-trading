const anyMetaTagPattern = /^\(([^)]+)\)(?=\s|$)/
const metaTagThemes: Record<string, string> = {
    pseudo: 'pseudo',
    psuedo: 'pseudo',
    explicit: 'explicit',
    implicit: 'implicit',
    enchant: 'enchant',
    imbued: 'enchant',
    fractured: 'fractured',
    scourge: 'red',
    mercenary: 'mercenary',
    delve: 'delve',
    sanctum: 'sanctum',
    crucible: 'red',
}

export function decorateMetaTag(option: HTMLElement) {
    restoreMetaTags(option)
    const text = Array.from(option.querySelectorAll<HTMLElement>('span')).find((span) => {
        if (span.children.length) return false
        const tag = (span.textContent ?? '').match(anyMetaTagPattern)?.[1].toLowerCase()
        return Boolean(tag && metaTagThemes[tag])
    })
    if (!text) return
    const match = (text.textContent ?? '').match(anyMetaTagPattern)
    if (!match) return
    const tag = match[1].toLowerCase()
    const theme = metaTagThemes[tag]
    if (!theme) return
    text.dataset.btMetaTagLabel = tag === 'psuedo' ? 'Pseudo' : tag
    text.dataset.btMetaStat = (text.textContent ?? '').slice(match[0].length).trimStart()
    text.dataset.btMetaTagTheme = theme
}

export function restoreMetaTags(root: ParentNode = document) {
    root.querySelectorAll<HTMLElement>('[data-bt-meta-tag-label]').forEach((tag) => {
        delete tag.dataset.btMetaTagLabel
        delete tag.dataset.btMetaStat
        delete tag.dataset.btMetaTagTheme
    })
}

export function decorateMetaTags() {
    document.querySelectorAll<HTMLElement>('.multiselect__option').forEach(decorateMetaTag)
}
