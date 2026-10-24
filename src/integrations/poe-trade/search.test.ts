// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import fixture from './fixtures/property-filters.html?raw'
import { applyFilterValue } from './search'

beforeEach(() => {
    document.body.innerHTML = fixture
})
afterEach(() => {
    document.body.innerHTML = ''
})
it('sets the supplied numeric filter markup and notifies the host', () => {
    const min = document.querySelector<HTMLInputElement>('input.minmax')!
    let received = ''
    min.addEventListener('input', () => {
        received = min.value
    })
    expect(applyFilterValue(['quality'], 'Quality', '20-30', () => {})).toBe(true)
    expect(received).toBe('20')
    expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe('30')
})
it('selects an option from the supplied nested option markup using click', () => {
    let selected = ''
    document.querySelectorAll('.multiselect__option').forEach((option) => {
        option.addEventListener('click', () => {
            selected = option.textContent!.trim()
        })
    })
    expect(applyFilterValue(['vaalgem'], 'Vaal Gem', 'yes', () => {})).toBe(true)
    expect(selected).toBe('Yes')
})

it('matches the explicitly requested Item Quality target', () => {
    document.querySelector('.filter-title')!.textContent = 'Item Quality'
    expect(applyFilterValue(['itemquality'], 'Item Quality', '20', () => {})).toBe(true)
    expect(document.querySelector<HTMLInputElement>('input.minmax')!.value).toBe('20')
})
