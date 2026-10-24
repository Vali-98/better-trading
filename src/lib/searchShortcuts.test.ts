// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { consumeSearchShortcuts } from './searchShortcuts'

function setup(value: string) {
    document.body.innerHTML = `<input id="search"><div class="filter filter-property"><span class="filter-body"><div class="filter-title">Item Level</div><input type="number" class="form-control minmax" placeholder="min"><input type="number" class="form-control minmax" placeholder="max"></span></div>`
    const input = document.querySelector<HTMLInputElement>('#search')!
    input.value = value
    return input
}
afterEach(() => {
    document.body.innerHTML = ''
})

it.each([
    ['il;40 ', '40', ''],
    ['il;30-90 ', '30', '90'],
    ['il30-90 ', '30', '90'],
    ['il;-90 ', '', '90'],
    ['~il;40 ', '40', ''],
])('applies %s and consumes it', (text, min, max) => {
    const input = setup(text)
    let received = ''
    document.querySelector('input.minmax')!.addEventListener('input', (event) => {
        received = (event.target as HTMLInputElement).value
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(input.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe(min)
    expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe(max)
    expect(received).toBe(min)
})

it.each(['il;40', 'il;90-30 ', 'il;abc ', 'unknown;40 '])(
    'leaves invalid or unfinished %s intact',
    (text) => {
        const input = setup(text)
        expect(consumeSearchShortcuts(input)).toBe(false)
        expect(input.value).toBe(text)
    }
)

it('preserves item search text and its cursor', () => {
    const input = setup('~boots il;40 life')
    input.setSelectionRange(input.value.length, input.value.length)
    consumeSearchShortcuts(input)
    expect(input.value).toBe('~boots life')
    expect(input.selectionStart).toBe(input.value.length)
})

it('selects Yes/No/Any options through the multiselect event handler', () => {
    const input = setup('vaalgem;yes ')
    document.body.insertAdjacentHTML(
        'beforeend',
        `<div class="filter filter-property spaced"><span class="filter-body"><div class="filter-title">Vaal Gem</div><div class="multiselect filter-select"><span class="multiselect__option">Any</span><span class="multiselect__option">Yes</span><span class="multiselect__option">No</span></div></span></div>`
    )
    let selected = ''
    document.querySelectorAll('.multiselect__option').forEach((option) => {
        option.addEventListener('click', () => {
            selected = option.textContent!
        })
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(selected).toBe('Yes')
    expect(input.value).toBe('')
})

it('consumes consecutive shortcuts', () => {
    const input = setup('il;40 il;50 ')
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(input.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('50')
})

it.each([
    ['y', 'Yes'],
    ['yes', 'Yes'],
    ['n', 'No'],
    ['no', 'No'],
    ['a', 'Any'],
    ['any', 'Any'],
])('sets Identified with id;%s', (value, expected) => {
    const input = setup(`id;${value} `)
    document.body.insertAdjacentHTML(
        'beforeend',
        `<div class="filter filter-property spaced"><span class="filter-body"><div class="filter-title">Identified</div><div class="multiselect filter-select"><span class="multiselect__option">Any</span><span class="multiselect__option">Yes</span><span class="multiselect__option">No</span></div></span></div>`
    )
    let selected = ''
    document.querySelectorAll('.multiselect__option').forEach((option) => {
        option.addEventListener('click', () => {
            selected = option.textContent!
        })
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(selected).toBe(expected)
    expect(input.value).toBe('')
})

it.each(['Miscellaneous', 'Requirements'])('expands the containing %s subsection once', (title) => {
    const input = setup('il;40 il;50 ')
    const filter = document.querySelector('.filter-property')!
    const group = document.createElement('div')
    group.className = 'filter-group'
    group.innerHTML = `<div class="filter"><span class="input-group-btn"><button class="btn toggle-btn"></button></span><span class="filter-body"><span class="filter-title filter-title-clickable"><span>${title}</span></span></span></div><div class="filter-group-body" style="display:none"></div>`
    document.body.append(group)
    group.querySelector('.filter-group-body')!.append(filter)
    let clicks = 0
    group.querySelector('button')!.addEventListener('click', () => {
        clicks++
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(clicks).toBe(1)
})

it('leaves an already expanded subsection open', () => {
    const input = setup('il;40 ')
    const filter = document.querySelector('.filter-property')!
    const group = document.createElement('div')
    group.className = 'filter-group'
    group.innerHTML = '<button class="toggle-btn"></button><div class="filter-group-body"></div>'
    document.body.append(group)
    group.querySelector('.filter-group-body')!.append(filter)
    let clicks = 0
    group.querySelector('button')!.addEventListener('click', () => {
        clicks++
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(clicks).toBe(0)
})

it('warns when a known filter is missing and preserves the shortcut', () => {
    const input = setup('id;y ')
    let warnings: string[] = []
    expect(
        consumeSearchShortcuts(input, (messages) => {
            warnings = messages
        })
    ).toBe(false)
    expect(input.value).toBe('id;y ')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Identified is not available on this trade page')
})

it('does not click an already selected option and accidentally deselect it', () => {
    const input = setup('id;a ')
    document.body.insertAdjacentHTML(
        'beforeend',
        '<div class="filter filter-property"><div class="filter-title">Identified</div><div class="multiselect"><span class="multiselect__option multiselect__option--selected">Any</span></div></div>'
    )
    let clicks = 0
    document.querySelector('.multiselect__option')!.addEventListener('click', () => {
        clicks++
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(clicks).toBe(0)
    expect(input.value).toBe('')
})

it.each([';clear ', '~;clear ', ';rmrf ', ':clear ', '~:clear ', ':rmrf '])(
    'resets filters using the Clear button for %s',
    (text) => {
        const input = setup(text)
        document.body.insertAdjacentHTML(
            'beforeend',
            '<button class="btn clear-btn" type="button"><span>Clear</span></button>'
        )
        let cleared = 0
        document.querySelector('button')!.addEventListener('click', () => {
            cleared++
        })
        expect(consumeSearchShortcuts(input)).toBe(true)
        expect(cleared).toBe(1)
        expect(input.value).toBe('')
    }
)

it('does not consume clear until a trailing space is typed', () => {
    const input = setup(';clear')
    expect(consumeSearchShortcuts(input)).toBe(false)
    expect(input.value).toBe(';clear')
})

it('warns and preserves clear when the button is missing', () => {
    const input = setup(';clear ')
    let warnings: string[] = []
    expect(
        consumeSearchShortcuts(input, (messages) => {
            warnings = messages
        })
    ).toBe(false)
    expect(input.value).toBe(';clear ')
    expect(warnings[0]).toContain('Clear button is unavailable')
})

it('opens Show Filters once for multiple applied shortcuts and leaves open panels alone', async () => {
    const input = setup('il;40 il;50 ')
    document.body.insertAdjacentHTML(
        'beforeend',
        '<button class="btn toggle-search-btn"><span class="chevron collapsed"></span><span>Show Filters</span></button>'
    )
    const button = document.querySelector('button')!
    let clicks = 0
    button.addEventListener('click', () => {
        clicks++
        queueMicrotask(() => button.querySelector('.chevron')!.classList.remove('collapsed'))
    })
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(clicks).toBe(1)
    await Promise.resolve()
    input.value = 'il;60 '
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(clicks).toBe(1)
})

function setupSockets(value: string) {
    const input = setup(value)
    const filter = document.querySelector('.filter-property')!
    filter.querySelector('.filter-title')!.textContent = 'Sockets'
    for (const color of ['R', 'G', 'B', 'W'])
        filter.insertAdjacentHTML(
            'beforeend',
            `<input type="number" class="form-control socket" placeholder="${color}" value="1">`
        )
    return input
}

it.each([
    ['soc;6w ', ['', '', '', '6']],
    ['soc;1b2g1r ', ['1', '2', '1', '']],
    ['soc;2b1g ', ['', '1', '2', '']],
    ['soc;1g2b ', ['', '1', '2', '']],
    ['soc;1b1g1b ', ['', '1', '2', '']],
])('applies socket colors in arbitrary order: %s', (text, expected) => {
    const input = setupSockets(text)
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(
        Array.from(
            document.querySelectorAll<HTMLInputElement>('input.socket'),
            (input) => input.value
        )
    ).toEqual(expected)
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('')
    expect(input.value).toBe('')
})

it('sets total socket minimum and clears previous colors', () => {
    const input = setupSockets('soc;6 ')
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('6')
    expect(
        Array.from(
            document.querySelectorAll<HTMLInputElement>('input.socket'),
            (input) => input.value
        )
    ).toEqual(['', '', '', ''])
})

it.each(['soc;7w ', 'soc;4b3r ', 'soc;2.5 ', 'soc;7 ', 'soc;2x '])(
    'preserves invalid sockets %s',
    (text) => {
        const input = setupSockets(text)
        expect(consumeSearchShortcuts(input)).toBe(false)
        expect(input.value).toBe(text)
        expect(document.querySelector<HTMLInputElement>('input.socket')!.value).toBe('1')
    }
)

it.each([
    ['dmg', 'Damage'],
    ['aps', 'Attacks per Second'],
    ['cc', 'Critical Strike Chance'],
    ['dps', 'Damage per Second'],
    ['pdps', 'Physical DPS'],
    ['edps', 'Elemental DPS'],
    ['ar', 'Armour'],
    ['ev', 'Evasion Rating'],
    ['es', 'Energy Shield'],
    ['ward', 'Ward'],
    ['block', 'Block'],
    ['bp', 'Base Defence Percentile'],
])('sets numeric alias %s', (key, title) => {
    const input = setup(`${key};10-20 `)
    document.querySelector('.filter-title')!.textContent = title
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('10')
    expect(document.querySelector<HTMLInputElement>('[placeholder="max"]')!.value).toBe('20')
})

it.each(['il:40 ', 'il;40 ', 'il:30 il;40 '])('supports either separator: %s', (text) => {
    const input = setup(text)
    expect(consumeSearchShortcuts(input)).toBe(true)
    expect(input.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('[placeholder="min"]')!.value).toBe('40')
})
