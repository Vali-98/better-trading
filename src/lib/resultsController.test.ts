// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { browser } from 'wxt/browser'
vi.mock('wxt/browser', () => ({
    browser: {
        runtime: { sendMessage: vi.fn(), getURL: (path: string) => `moz-extension://test${path}` },
        storage: { local: { get: async () => ({}), set: async () => {} } },
    },
}))
import { startResultsController } from './resultsController'
import { useSettingsStore } from '../stores/settings'
import { usePinnedStore } from '../stores/pinned'

let stop = () => {}
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))
const row = (id: string) =>
    `<div class="row" data-id="${id}"><div class="profile-link"><a href="/account/view-profile/seller">Seller</a></div><div class="itemHeader">Armour</div><div class="icon"><img src="https://web.poecdn.com/BodyArmours/test.png"></div><div class="sockets"><i class="socket"></i></div><div class="itemLevel">Item level: 24</div><div class="middle">Details</div><div class="itemRendered"><div class="explicitMod">+30 to maximum Life</div></div><div class="details"><div class="price">5 chaos</div><div class="btns"></div></div></div>`
beforeEach(() => {
    window.history.replaceState({}, '', '/trade/search/Standard/test')
    document.body.innerHTML = `<div id="trade"><div class="resultset">${row('one')}${row('two')}</div></div>`
    usePinnedStore.setState({ pinned: [] })
    useSettingsStore.setState({ disabled: ['equivalent-pricings'] })
})
it('converts chaos to divine on PoE2 and normalizes primary currency rates', async () => {
    window.history.replaceState({}, '', '/trade2/search/Standard/test')
    document.querySelector('.price')!.innerHTML =
        '<div data-field="price"><br><span>100</span><span class="currency-text"><span>Chaos Orb</span></span></div>'
    vi.mocked(browser.runtime.sendMessage).mockImplementation(
        vi.fn(async () => ({
            lines: [
                { id: 'chaos', primaryValue: 2 },
                { id: 'divine', primaryValue: 200 },
            ],
            items: [
                { id: 'chaos', detailsId: 'chaos-orb' },
                { id: 'divine', detailsId: 'divine-orb' },
            ],
        })) as typeof browser.runtime.sendMessage
    )
    useSettingsStore.setState({ disabled: [] })
    stop = startResultsController(new QueryClient())
    await settle()
    expect(document.querySelector('.bt-equivalent-pricings')?.textContent).toBe('= 1 × ')
    expect(document.querySelector<HTMLImageElement>('.bt-equivalent-pricings img')?.alt).toBe(
        'divine'
    )
})
afterEach(() => {
    stop()
    document.body.innerHTML = ''
})
it('does not reprocess mixed exchange rows in response to its own grouping writes', async () => {
    const exchange = document.createElement('div')
    exchange.className = 'row exchange'
    exchange.dataset.id = 'exchange'
    document.querySelector('.resultset')!.append(exchange)
    const groupWrites = vi.spyOn(Node.prototype, 'textContent', 'set')
    stop = startResultsController(new QueryClient())
    await settle()
    const writes = groupWrites.mock.calls.length
    await settle()
    expect(groupWrites.mock.calls.length).toBe(writes)
    expect(exchange.hasAttribute('bt-enhanced')).toBe(false)
    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(1)
    groupWrites.mockRestore()
})
it('enhances each row once and removes all injected controls on cleanup', async () => {
    stop = startResultsController(new QueryClient())
    await settle()
    expect(document.querySelectorAll('.bt-pin-button')).toHaveLength(2)
    expect(document.querySelectorAll('.bt-maximum-sockets')).toHaveLength(2)
    expect(document.querySelector('[data-id="two"]')?.getAttribute('bt-regroup-state')).toBe(
        'hidden'
    )
    document.querySelector<HTMLButtonElement>('.bt-group-button')!.click()
    expect(document.querySelector('[data-id="two"]')?.getAttribute('bt-regroup-state')).toBe(
        'visible'
    )
    stop()
    expect(
        document.querySelectorAll(
            '[bt-enhanced],.bt-pin-button,.bt-maximum-sockets,.bt-group-button'
        )
    ).toHaveLength(0)
})
it('pins, unpins and clears snapshots when results reset', async () => {
    stop = startResultsController(new QueryClient())
    await settle()
    const button = document.querySelector<HTMLButtonElement>('.bt-pin-button')!
    button.click()
    expect(usePinnedStore.getState().pinned).toHaveLength(1)
    expect(button.textContent).toBe('Unpin')
    button.click()
    expect(usePinnedStore.getState().pinned).toHaveLength(0)
    button.click()
    document.querySelector('.resultset')!.replaceChildren()
    await settle()
    expect(usePinnedStore.getState().pinned).toHaveLength(0)
})
it('reapplies settings without duplicating controls', async () => {
    stop = startResultsController(new QueryClient())
    await settle()
    useSettingsStore.getState().toggle('maximum-sockets')
    await settle()
    expect(document.querySelectorAll('.bt-maximum-sockets')).toHaveLength(0)
    expect(document.querySelectorAll('.bt-pin-button')).toHaveLength(2)
})
it('highlights current item-mod markup that matches an active stat filter', async () => {
    const mod = document.querySelector<HTMLElement>('.explicitMod')!
    mod.className = 'item-mod item-mod--explicit'
    mod.textContent = '+32 to Strength'
    document
        .querySelector('#trade')!
        .insertAdjacentHTML(
            'beforeend',
            '<div class="search-advanced-pane"><div class="filter-group-body"><div class="filter"><div class="filter-title"><i class="mutate-type">explicit</i><span>+# to Strength</span></div></div></div></div>'
        )
    stop = startResultsController(new QueryClient())
    await settle()
    expect(
        document
            .querySelector('.item-mod--explicit')
            ?.classList.contains('bt-highlight-stat-filters')
    ).toBe(true)
})

it('uses the bundled PoE2 chaos image for chaos-equivalent prices', async () => {
    window.history.replaceState({}, '', '/trade2/search/poe2/Standard/test')
    document.querySelector('.price')!.innerHTML =
        '<div data-field="price"><br><span>1</span><span class="currency-text"><span>Divine Orb</span></span></div>'
    vi.mocked(browser.runtime.sendMessage).mockImplementation((async () => ({
        lines: [
            { id: 'chaos', primaryValue: 1 },
            { id: 'divine', primaryValue: 100 },
        ],
        items: [
            { id: 'chaos', detailsId: 'chaos-orb' },
            { id: 'divine', detailsId: 'divine-orb' },
        ],
    })) as typeof browser.runtime.sendMessage)
    useSettingsStore.setState({ disabled: [] })
    stop = startResultsController(new QueryClient())
    await settle()
    const icon = document.querySelector<HTMLImageElement>('.bt-equivalent-pricings img')!
    expect(icon.src).toContain('/assets/images/bookmark-folder/poe2/items/chaos.png')
})
