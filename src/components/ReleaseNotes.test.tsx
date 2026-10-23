import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReleaseNotes } from './ReleaseNotes'
it('renders Markdown bullets and nested lists', () => {
    const html = renderToStaticMarkup(<ReleaseNotes markdown={'- First\n- Second\n  - Nested'} />)
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>First</li>')
    expect(html).toContain('<li>Nested</li>')
})
it('renders HTML ul/li while sanitizing unsafe HTML', () => {
    const html = renderToStaticMarkup(
        <ReleaseNotes
            markdown={
                '<ul><li>Note</li></ul><script>alert(1)</script><img src="x" onerror="alert(1)" />'
            }
        />
    )
    expect(html).toContain('<ul><li>Note</li></ul>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
})
