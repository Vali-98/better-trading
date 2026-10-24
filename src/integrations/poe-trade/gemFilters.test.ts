// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { applyGemFilters, searchGemVariant } from './gemFilters'
afterEach(() => {
    document.body.innerHTML = ''
})
it.each([
    ['1', 'Quality'],
    ['2', 'Item Quality'],
] as const)('applies exact gem ranges and corruption for PoE%s', (version, quality) => {
    document.body.innerHTML =
        ['Gem Level', quality]
            .map(
                (title) =>
                    `<div class="filter filter-property"><div class="filter-title">${title}</div><input class="minmax" placeholder="min"><input class="minmax" placeholder="max"></div>`
            )
            .join('') +
        '<div class="filter filter-property"><div class="filter-title">Corrupted</div><span class="multiselect__option">Yes</span><span class="multiselect__option">No</span></div>'
    let selected = ''
    document.querySelectorAll('.multiselect__option').forEach((option) =>
        option.addEventListener('click', () => {
            selected = option.textContent!
        })
    )
    expect(applyGemFilters({ level: 21, quality: 20, corrupted: true }, version)).toEqual([])
    expect(
        Array.from(document.querySelectorAll<HTMLInputElement>('input'), (input) => input.value)
    ).toEqual(['21', '21', '20', '20'])
    expect(selected).toBe('Yes')
    applyGemFilters({ level: 1, corrupted: false }, version)
    expect(
        Array.from(document.querySelectorAll<HTMLInputElement>('input'), (input) => input.value)
    ).toEqual(['1', '1', '', ''])
    expect(selected).toBe('No')
})

it('submits the host search after filter updates have settled', async () => {
    document.body.innerHTML =
        ['Gem Level', 'Quality']
            .map(
                (title) =>
                    `<div class="filter filter-property"><div class="filter-title">${title}</div><input class="minmax" placeholder="min"><input class="minmax" placeholder="max"></div>`
            )
            .join('') +
        '<div class="filter filter-property"><div class="filter-title">Corrupted</div><span class="multiselect__option">Yes</span></div><button class="btn search-btn" type="button"><span>Search</span></button>'
    let updated = false
    document.querySelector('input')!.addEventListener('input', () =>
        queueMicrotask(() => {
            updated = true
        })
    )
    let searched = false
    document.querySelector('button')!.addEventListener('click', () => {
        searched = updated
    })
    expect(await searchGemVariant({ level: 21, quality: 20, corrupted: true }, '1')).toEqual([])
    expect(searched).toBe(true)
})
