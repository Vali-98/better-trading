// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
    activateLiveSearch,
    placeMergeControl,
    applyListingSources,
    clearListingSources,
} from '../../../../src/integrations/poe-trade/live/page'
afterEach(() => {
    document.body.innerHTML = ''
})
it('activates only the inactive native control when bootstrapping a folder destination', () => {
    document.body.innerHTML =
        '<button class="livesearch-btn"><span class="plus"></span><span>Activate Live Search</span></button>'
    const button = document.querySelector('button')!
    const click = vi.spyOn(button, 'click')
    activateLiveSearch()
    expect(click).toHaveBeenCalledTimes(1)
    button.textContent = 'Deactivate Live Search'
    activateLiveSearch()
    expect(click).toHaveBeenCalledTimes(1)
    button.textContent = 'Activate Live Search'
    button.disabled = true
    activateLiveSearch()
    expect(click).toHaveBeenCalledTimes(1)
})

it('places Merge directly after the native Live Search button', () => {
    document.body.innerHTML =
        '<div class="controls-left"><button class="livesearch-btn">Activate Live Search</button><button>Other</button></div>'
    vi.spyOn(document.querySelector('.livesearch-btn')!, 'getBoundingClientRect').mockReturnValue({
        height: 38,
    } as DOMRect)
    const merge = document.createElement('span')
    merge.className = 'bt-live-merge'
    placeMergeControl(merge)
    expect(document.querySelector('.livesearch-btn')!.nextElementSibling).toBe(merge)
    expect(merge.style.getPropertyValue('--bt-live-button-height')).toBe('38px')
    placeMergeControl(merge)
    expect(document.querySelectorAll('.bt-live-merge')).toHaveLength(1)
})

it('places source labels at the top of the left column without changing the row layout', () => {
    document.body.innerHTML =
        '<div class="resultset"><div class="row" data-id="listing"><div class="left"></div><div class="middle"></div><div class="right"></div></div></div>'
    const labels = new Map([['listing', new Map([['search', 'Search label']])]])
    applyListingSources(labels)
    applyListingSources(labels)
    const row = document.querySelector('.row')!
    const left = row.querySelector('.left')!
    expect(row.firstElementChild).toBe(left)
    expect(left.firstElementChild?.className).toBe('bt-live-source')
    expect(left.firstElementChild?.textContent).toBe('Search label')
    expect(row.classList.contains('bt-live-sourced')).toBe(false)
    expect(row.querySelectorAll('.bt-live-source')).toHaveLength(1)
    expect(row.querySelectorAll(':scope > .left, :scope > .middle, :scope > .right')).toHaveLength(
        3
    )
    clearListingSources()
    expect(row.classList.contains('bt-live-sourced')).toBe(false)
    expect(row.querySelector('.bt-live-source')).toBeNull()
})
