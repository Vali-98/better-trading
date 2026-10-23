import { usePanelStore } from '../../stores/panel'
import { useResultsStore } from '../../stores/results'
export type AddNode = (node: HTMLElement, parent: Element) => void

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')

export function addPinButton(row: HTMLElement, add: AddNode) {
    const buttons = row.querySelector('.details .btns')
    if (!buttons) return
    const button = document.createElement('button')
    button.className = 'btn btn-default bt-pin-button'
    button.textContent = 'Pin'
    button.onclick = () => {
        const id = row.dataset.id!
        const state = useResultsStore.getState()
        if (state.pinned.some((item) => item.id === id)) {
            state.setPinned(state.pinned.filter((item) => item.id !== id))
            return
        }
        const node = document.createElement('div')
        for (const selector of ['.middle', '.itemRendered', '.details .price']) {
            const part = row.querySelector(selector)
            if (part) node.append(part.cloneNode(true))
        }
        node.querySelectorAll('script,iframe,object,button').forEach((element) => element.remove())
        state.setPinned([...state.pinned, { id, pinnedAt: new Date().toISOString(), node }])
        usePanelStore.getState().setPage('pinned-items')
    }
    add(button, buttons)
}

export function addEquivalentPrices(
    row: HTMLElement,
    ratios: Record<string, number>,
    add: AddNode
) {
    const price = row.querySelector('.price')
    const amount = parseFloat(
        row.querySelector('[data-field="price"] > br + span')?.textContent ?? ''
    )
    const currency = slugify(
        row.querySelector('[data-field="price"] .currency-text span')?.textContent ?? ''
    )
    if (!price || !amount) return
    const append = (text: string) => {
        const span = document.createElement('span')
        span.className = 'bt-equivalent-pricings'
        const originalIcon = row.querySelector<HTMLImageElement>(
            '[data-field="price"] .currency-image img'
        )
        const currencies = new Map([
            [
                'chaos',
                {
                    src: 'https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png',
                    alt: 'chaos',
                },
            ],
            [
                'divine',
                {
                    src: 'https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyModValues.png',
                    alt: 'divine',
                },
            ],
            [currency, { src: originalIcon?.src ?? '', alt: originalIcon?.alt || currency }],
        ])
        const pattern = new RegExp(
            '(' +
                [...currencies.keys()]
                    .sort((a, b) => b.length - a.length)
                    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                    .join('|') +
                ')',
            'g'
        )
        for (const part of text.split(pattern)) {
            const icon = currencies.get(part)
            if (icon?.src) {
                const image = document.createElement('img')
                image.src = icon.src
                image.alt = icon.alt
                span.append(image)
            } else span.append(document.createTextNode(part))
        }
        add(span, price)
    }
    const value = ratios[currency]
    const divine = ratios['divine-orb']
    if (currency === 'chaos-orb' && divine && amount >= 0.5 * divine)
        append('= ' + Math.round((amount / divine) * 10) / 10 + ' × divine')
    else if (currency !== 'chaos-orb' && value && Math.round(amount * value)) {
        append('= ' + Math.round(amount * value) + ' × chaos')
        if (Math.floor(amount) && amount % 1 && value >= 1)
            append(
                '= ' +
                    Math.floor(amount) +
                    ' × ' +
                    currency +
                    ' + ' +
                    Math.round((amount % 1) * value) +
                    ' × chaos'
            )
    }
}
