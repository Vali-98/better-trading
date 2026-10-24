// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './fixtures/property-filters.html?raw'
import {
    applyFilters,
    applyFilterText,
    applyCustomFilter,
    applyFiltersAndSearch,
} from '../../../src/integrations/poe-trade/search'

describe('property filters', () => {
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
        expect(applyFilterText('quality', '20-30').ok).toBe(true)
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
        expect(applyFilterText('vaalGem', 'yes').ok).toBe(true)
        expect(selected).toBe('Yes')
    })

    it('matches the explicitly requested Item Quality target', () => {
        document.querySelector('.filter-title')!.textContent = 'Item Quality'
        expect(applyCustomFilter('itemquality', '20').ok).toBe(true)
        expect(document.querySelector<HTMLInputElement>('input.minmax')!.value).toBe('20')
    })
})

describe('linked variants', () => {
    function setup() {
        document.body.innerHTML =
            '<div class="filter filter-property"><span class="filter-body"><div class="filter-title">Link Groups</div><input class="socket" placeholder="R" value="2"><input class="minmax" placeholder="min"><input class="minmax" placeholder="max"></span></div><button class="btn search-btn"></button>'
    }
    afterEach(() => {
        document.body.innerHTML = ''
    })
    it.each([4, 5, 6])('sets Link Groups minimum to %i through shortcuts', (count) => {
        setup()
        expect(applyFilterText('links', String(count)).ok).toBe(true)
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
        expect(await applyFiltersAndSearch({ links: { min: 6, max: 6 } })).toEqual([])
        expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('6')
        expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe('6')
        expect(searched).toBe(true)
    })
})

describe('filter batches', () => {
    const numeric = (title: string) =>
        `<div class="filter filter-property"><div class="filter-title">${title}</div><input class="minmax" placeholder="min" value="5"><input class="minmax" placeholder="max" value="10"></div>`
    afterEach(() => {
        document.body.innerHTML = ''
        window.history.replaceState({}, '', '/')
        vi.restoreAllMocks()
    })
    it('preflights a batch before mutating any field or submitting', async () => {
        document.body.innerHTML = numeric('Quality') + '<button class="search-btn"></button>'
        const clicked = vi.fn()
        document.querySelector('button')!.onclick = clicked
        const result = applyFilters({ quality: { min: 20 }, corrupted: 'yes' })
        expect(result.ok).toBe(false)
        expect(result.applied).toEqual([])
        expect(result.failures[0]).toMatchObject({ filter: 'corrupted', reason: 'unavailable' })
        expect(document.querySelector<HTMLInputElement>('input')!.value).toBe('5')
        expect(await applyFiltersAndSearch({ quality: { min: 20 }, corrupted: 'yes' })).not.toEqual(
            []
        )
        expect(clicked).not.toHaveBeenCalled()
    })
    it('shares exact ranges and clearing across callers using game-specific targets', () => {
        window.history.replaceState({}, '', '/trade2/search/poe2/Standard/test')
        document.body.innerHTML = numeric('Quality') + numeric('Item Quality')
        expect(applyFilters({ quality: { min: 21, max: 21 } }).ok).toBe(true)
        expect(
            Array.from(document.querySelectorAll<HTMLInputElement>('input'), (input) => input.value)
        ).toEqual(['5', '10', '21', '21'])
        expect(applyFilters({ quality: null }).ok).toBe(true)
        expect(
            Array.from(document.querySelectorAll<HTMLInputElement>('input'), (input) => input.value)
        ).toEqual(['5', '10', '', ''])
    })
    it('uses capabilities instead of titles for socket validation', () => {
        document.body.innerHTML = numeric('Sockets')
        expect(applyFilterText('sockets', '7').ok).toBe(false)
        expect(applyFilterText('sockets', '2.5').ok).toBe(false)
        window.history.replaceState({}, '', '/trade2/search/poe2/Standard/test')
        document.querySelector('.filter-title')!.textContent = 'Augmentable Sockets'
        expect(applyFilterText('sockets', '2b').ok).toBe(false)
        expect(applyFilterText('sockets', '2-3').ok).toBe(true)
    })
    it('does not submit when input handlers change the search before the host update settles', async () => {
        window.history.replaceState({}, '', '/trade/search/Standard/first')
        document.body.innerHTML = numeric('Quality') + '<button class="search-btn"></button>'
        const clicked = vi.fn()
        document.querySelector('button')!.onclick = clicked
        document
            .querySelector('input')!
            .addEventListener('input', () =>
                queueMicrotask(() =>
                    window.history.replaceState({}, '', '/trade/search/Standard/second')
                )
            )
        expect(await applyFiltersAndSearch({ quality: { min: 20 } })).toEqual([
            'The search changed before it could be submitted.',
        ])
        expect(clicked).not.toHaveBeenCalled()
    })
    it('rejects invalid structured values before changing the form', () => {
        document.body.innerHTML = numeric('Quality')
        for (const value of [{ min: NaN }, { min: 30, max: 20 }, { min: -1 }]) {
            expect(applyFilters({ quality: value }).failures[0].reason).toBe('invalid')
        }
        expect(document.querySelector<HTMLInputElement>('input')!.value).toBe('5')
    })
})
