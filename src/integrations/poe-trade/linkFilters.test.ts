// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { applyFilterValue } from './search'
import { searchLinkedVariant } from './linkFilters'
function setup() {
    document.body.innerHTML =
        '<div class="filter filter-property"><span class="filter-body"><div class="filter-title">Link Groups</div><input class="socket" placeholder="R" value="2"><input class="minmax" placeholder="min"><input class="minmax" placeholder="max"></span></div><button class="btn search-btn"></button>'
}
afterEach(() => {
    document.body.innerHTML = ''
})
it.each([4, 5, 6])('sets Link Groups minimum to %i through shortcuts', (count) => {
    setup()
    expect(
        applyFilterValue(['linkgroups', 'link', 'links'], 'Link Groups', String(count), () => {})
    ).toBe(true)
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe(
        String(count)
    )
    expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('[placeholder="R"]')!.value).toBe('')
})
it('applies an exact linked variant and submits the search', async () => {
    setup()
    let searched = false
    document.querySelector('button')!.addEventListener('click', () => {
        searched = true
    })
    expect(await searchLinkedVariant(6)).toEqual([])
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('6')
    expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe('6')
    expect(searched).toBe(true)
})
