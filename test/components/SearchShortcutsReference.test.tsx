import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReleaseNotes } from '../../src/components/ReleaseNotes'
import {
    searchShortcutsMarkdown,
    shortcutDefinitions,
} from '../../src/lib/searchShortcutDefinitions'

it('renders the generated shortcut reference as a table with every defined key', () => {
    const html = renderToStaticMarkup(<ReleaseNotes markdown={searchShortcutsMarkdown()} />)
    expect(html).toContain('<table>')
    for (const { keys } of shortcutDefinitions)
        for (const key of keys) expect(html).toContain(`<code>${key}</code>`)
    expect(html).toContain('<code>id;y</code>')
    expect(html).toContain('Quality (PoE1) / Item Quality (PoE2)')
    expect(html).not.toContain('[object Object]')
})

it('keeps the standalone document synchronized with the reference', () => {
    const doc = readFileSync(new URL('../../docs/search-shortcuts.md', import.meta.url), 'utf8')
    expect(doc.slice(doc.indexOf('# Search shortcuts'))).toBe(searchShortcutsMarkdown())
})
