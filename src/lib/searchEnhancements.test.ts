// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useSettingsStore } from '../stores/settings'
import { startSearchEnhancements } from './searchEnhancements'

let stop: () => void
const originalDisabled = useSettingsStore.getState().disabled

beforeEach(() => {
    useSettingsStore.setState({ disabled: [] })
    stop = startSearchEnhancements()
})

afterEach(() => {
    stop()
    document.body.innerHTML = ''
    useSettingsStore.setState({ disabled: originalDisabled })
})

it.each(['Search Items...', '+ Add Stat Filter'])(
    'prefixes typing in %s before the site receives it and preserves the cursor',
    (placeholder) => {
        document.body.innerHTML = `<input class="multiselect__input" placeholder="${placeholder}">`
        const input = document.querySelector('input')!
        input.focus()
        input.placeholder = ''
        expect(input.value).toBe('')
        input.value = 'life'
        input.setSelectionRange(2, 2)
        let received = ''
        input.addEventListener('input', () => (received = input.value))
        input.dispatchEvent(new InputEvent('input', { bubbles: true }))
        expect(received).toBe('~life')
        expect(input.selectionStart).toBe(3)
    }
)

it.each(['', ' life', '~life'])('leaves %j unchanged', (value) => {
    document.body.innerHTML = '<input class="multiselect__input" placeholder="Search Items...">'
    const input = document.querySelector('input')!
    input.value = value
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(input.value).toBe(value)
})

it('respects the separate search setting', () => {
    useSettingsStore.setState({ disabled: ['default-search-filter-tilde'] })
    document.body.innerHTML = '<input class="multiselect__input" placeholder="Search Items...">'
    const input = document.querySelector('input')!
    input.value = 'life'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(input.value).toBe('life')
})

it('notifies the site after composition finishes', () => {
    document.body.innerHTML = '<input class="multiselect__input" placeholder="Search Items...">'
    const input = document.querySelector('input')!
    input.focus()
    input.placeholder = ''
    input.value = 'life'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }))
    expect(input.value).toBe('life')
    let received = ''
    input.addEventListener('input', () => (received = input.value))
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    expect(received).toBe('~life')
})

it('applies shortcuts with tilde enabled or disabled and notifies the item search', () => {
    document.body.innerHTML = `<input class="multiselect__input" placeholder="Search Items..."><div class="filter filter-property"><div class="filter-title">Item Level</div><input class="minmax" type="number" placeholder="min"><input class="minmax" type="number" placeholder="max"></div>`
    const input = document.querySelector<HTMLInputElement>('input.multiselect__input')!
    input.focus()
    input.placeholder = ''
    let received = ''
    input.addEventListener('input', () => (received = input.value))
    for (const disabled of [[], ['default-search-filter-tilde']]) {
        useSettingsStore.setState({ disabled })
        input.value = '~boots il;40 '
        input.dispatchEvent(new InputEvent('input', { bubbles: true }))
        expect(received).toBe('~boots ')
        expect(document.querySelector<HTMLInputElement>('input.minmax')!.value).toBe('40')
    }
    useSettingsStore.setState({
        disabled: ['search-filter-shortcuts', 'default-search-filter-tilde'],
    })
    input.value = 'il;50 '
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(received).toBe('il;50 ')
    expect(document.querySelector<HTMLInputElement>('input.minmax')!.value).toBe('40')
})

it('shows unavailable-filter warnings by the search bar and clears them after editing', () => {
    document.body.innerHTML =
        '<div class="search-bar"><input class="multiselect__input" placeholder="Search Items..."></div>'
    const input = document.querySelector<HTMLInputElement>('input')!
    input.value = 'id;y '
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    const warning = document.querySelector<HTMLElement>('.bt-search-shortcut-warning')!
    expect(warning.hidden).toBe(false)
    expect(warning.textContent).toContain('Identified is not available')
    input.value = 'boots'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(warning.hidden).toBe(true)
})

it('focuses item search with Shift+F and respects its toggle', () => {
    document.body.innerHTML = '<input class="multiselect__input" placeholder="Search Items...">'
    const input = document.querySelector('input')!
    const key = new KeyboardEvent('keydown', {
        key: 'F',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
    })
    document.body.dispatchEvent(key)
    expect(document.activeElement).toBe(input)
    expect(key.defaultPrevented).toBe(true)
    input.blur()
    useSettingsStore.setState({ disabled: ['focus-item-search'] })
    document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F', shiftKey: true, bubbles: true })
    )
    expect(document.activeElement).not.toBe(input)
})

it('leaves Shift+F available for typing in another input', () => {
    document.body.innerHTML =
        '<input id="other"><input class="multiselect__input" placeholder="Search Items...">'
    const other = document.querySelector<HTMLInputElement>('#other')!
    other.focus()
    const key = new KeyboardEvent('keydown', {
        key: 'F',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
    })
    other.dispatchEvent(key)
    expect(document.activeElement).toBe(other)
    expect(key.defaultPrevented).toBe(false)
})

it('suppresses the focus shortcut keypress and repeats, then allows normal F typing', () => {
    document.body.innerHTML = '<input class="multiselect__input" placeholder="Search Items...">'
    const input = document.querySelector('input')!
    document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F', shiftKey: true, bubbles: true, cancelable: true })
    )
    for (const [type, repeat] of [
        ['keypress', false],
        ['keydown', true],
        ['keypress', true],
    ] as const) {
        const event = new KeyboardEvent(type, {
            key: 'F',
            shiftKey: true,
            repeat,
            bubbles: true,
            cancelable: true,
        })
        input.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
    }
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'F', bubbles: true }))
    const typing = new KeyboardEvent('keypress', {
        key: 'F',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
    })
    input.dispatchEvent(typing)
    expect(typing.defaultPrevented).toBe(false)
})

it('opens and focuses stat search with Shift+S without typing S', () => {
    document.body.innerHTML =
        '<div class="multiselect__tags"><input class="multiselect__input" placeholder="+ Add Stat Filter"></div>'
    const input = document.querySelector('input')!
    let clicks = 0
    input.addEventListener('click', () => {
        clicks++
    })
    document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', shiftKey: true, bubbles: true, cancelable: true })
    )
    expect(document.activeElement).toBe(input)
    expect(clicks).toBe(1)
    const press = new KeyboardEvent('keypress', {
        key: 'S',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
    })
    input.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'S', bubbles: true }))
    input.blur()
    useSettingsStore.setState({ disabled: ['focus-stat-search'] })
    document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', shiftKey: true, bubbles: true })
    )
    expect(document.activeElement).not.toBe(input)
})

it('expands Show Filters before Shift+S focuses stat search', async () => {
    document.body.innerHTML =
        '<button class="btn toggle-search-btn"><span class="chevron collapsed"></span><span>Show Filters</span></button><div id="filters" style="display:none"><input class="multiselect__input" placeholder="+ Add Stat Filter"></div>'
    const button = document.querySelector('button')!
    const input = document.querySelector('input')!
    let clicks = 0
    button.addEventListener('click', () => {
        clicks++
        queueMicrotask(() => {
            button.querySelector('.chevron')!.classList.remove('collapsed')
            document.querySelector<HTMLElement>('#filters')!.style.display = ''
        })
    })
    document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'S', shiftKey: true, bubbles: true, cancelable: true })
    )
    await Promise.resolve()
    expect(clicks).toBe(1)
    expect(document.activeElement).toBe(input)
})

it.each(['il:40', 'il;40', 'il40'])(
    'consumes %s on Enter without letting the site search',
    (shortcut) => {
        document.body.innerHTML =
            '<input class="multiselect__input" placeholder="Search Items..."><div class="filter filter-property"><div class="filter-title">Item Level</div><input class="minmax" type="number" placeholder="min"><input class="minmax" type="number" placeholder="max"></div>'
        const input = document.querySelector<HTMLInputElement>('input.multiselect__input')!
        input.value = `~boots ${shortcut}`
        let siteKeys = 0
        let received = ''
        input.addEventListener('input', () => {
            received = input.value
        })
        for (const type of ['keydown', 'keypress', 'keyup'])
            input.addEventListener(type, () => {
                siteKeys++
            })
        for (const type of ['keydown', 'keypress', 'keyup']) {
            const event = new KeyboardEvent(type, { key: 'Enter', bubbles: true, cancelable: true })
            input.dispatchEvent(event)
            expect(event.defaultPrevented).toBe(true)
        }
        expect(siteKeys).toBe(0)
        expect(received).toBe('~boots ')
        expect(document.querySelector<HTMLInputElement>('input.minmax')!.value).toBe('40')
        // The next Enter submits normally once no shortcut remains.
        const next = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        input.dispatchEvent(next)
        expect(next.defaultPrevented).toBe(false)
        expect(siteKeys).toBe(1)
    }
)

it.each([
    { value: 'boots', placeholder: 'Search Items...', disabled: [], composing: false },
    { value: 'unknown:40', placeholder: 'Search Items...', disabled: [], composing: false },
    { value: 'il:40', placeholder: '+ Add Stat Filter', disabled: [], composing: false },
    {
        value: 'il:40',
        placeholder: 'Search Items...',
        disabled: ['search-filter-shortcuts'],
        composing: false,
    },
    { value: 'il:40', placeholder: 'Search Items...', disabled: [], composing: true },
])(
    'preserves normal Enter handling for $value ($placeholder, disabled=$disabled, composing=$composing)',
    ({ value, placeholder, disabled, composing }) => {
        useSettingsStore.setState({ disabled })
        document.body.innerHTML = `<input class="multiselect__input" placeholder="${placeholder}">`
        const input = document.querySelector('input')!
        input.value = value
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
            isComposing: composing,
        })
        input.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
        expect(input.value).toBe(value)
    }
)

it('consumes a trailing clear command on Enter', () => {
    document.body.innerHTML =
        '<input class="multiselect__input" placeholder="Search Items..."><button class="clear-btn"></button>'
    const input = document.querySelector('input')!
    let cleared = false
    document.querySelector('button')!.addEventListener('click', () => {
        cleared = true
    })
    input.value = ':clear'
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(cleared).toBe(true)
    expect(input.value).toBe('')
})
