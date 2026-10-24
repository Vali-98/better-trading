// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { scrollToPinned } from '../../src/lib/scrollToPinned'
afterEach(() => {
    document.body.replaceChildren()
})
it('highlights only the most recently scrolled-to result', () => {
    document.body.innerHTML =
        '<div class="resultset"><div class="row" data-id="one"></div><div class="row" data-id="two"></div></div>'
    const rows = document.querySelectorAll<HTMLElement>('.row')
    rows.forEach((row) => {
        row.scrollIntoView = vi.fn()
    })
    scrollToPinned('one')
    expect(rows[0].classList.contains('bt-scroll-target')).toBe(true)
    scrollToPinned('two')
    expect(document.querySelectorAll('.bt-scroll-target')).toHaveLength(1)
    expect(rows[1].classList.contains('bt-scroll-target')).toBe(true)
    expect(rows[1].scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
    })
    scrollToPinned('missing')
    expect(document.querySelectorAll('.bt-scroll-target')).toHaveLength(1)
})
