import { browser } from 'wxt/browser'
import { readListingPrice } from '../../../integrations/poe-trade/results'
import type { AddNode } from './types'

export function addEquivalentPrices(
    row: HTMLElement,
    ratios: Record<string, number>,
    add: AddNode,
    version: '1' | '2' = '1'
) {
    const { parent: price, amount, currency, icon: originalIcon } = readListingPrice(row)
    if (!price || !amount) return
    const append = (text: string) => {
        const span = document.createElement('span')
        span.className = 'bt-equivalent-pricings'
        const currencies = new Map([
            [
                'chaos',
                {
                    src:
                        version === '2'
                            ? browser.runtime.getURL(
                                  '/assets/images/bookmark-folder/poe2/items/chaos.png'
                              )
                            : 'https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png',
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
                    .map((key) => key.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'))
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
