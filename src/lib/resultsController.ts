import { browser } from 'wxt/browser'
import type { QueryClient } from '@tanstack/react-query'
import { useResultsStore } from '../stores/results'
import { usePanelStore } from '../stores/panel'
import { currentLocation } from './bookmarks/storage'
import { searchedStats } from './searchPanel'
import { getValue } from './storage'

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
export function startResultsController(client: QueryClient) {
    const style = document.createElement('style')
    style.textContent =
        '.bt-highlight-stat-filters{background:rgba(138,86,9,.35);color:#fff8e1!important}.bt-maximum-sockets{color:#e9bd66;text-align:center}.bt-equivalent-pricings{display:block;color:#aaa}.bt-equivalent-pricings img{height:20px;vertical-align:middle}[bt-regroup-state="hidden"]{display:none!important}.bt-pinned{outline:1px solid #8a5609}.bt-pin-button{margin-left:4px}'
    style.textContent += `.bt-pinned-snapshot{box-sizing:border-box;width:100%;max-width:100%;min-width:0;background:#000;overflow:hidden}.bt-pinned-snapshot .middle{width:100%!important;max-width:100%;min-width:0}.bt-pinned-snapshot .itemPopupContainer,.bt-pinned-snapshot .itemRendered,.bt-pinned-snapshot .item-popup{max-width:100%!important;min-width:0!important;margin:0 auto;background:#000;box-sizing:border-box}.bt-pinned-snapshot .itemRendered{width:100%!important}.bt-pinned-snapshot .itemPopupAdditional{display:flex;padding:3px 0;background:#000}.bt-pinned-snapshot .itemPopupAdditional .s{width:33.33%;text-align:center}.bt-pinned-snapshot .price{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;padding:5px 10px 10px;background:#000;color:#a38d6d}.bt-pinned-snapshot .price img{height:25px;width:auto}.bt-pinned-snapshot .price br,.bt-pinned-snapshot .price .currency-text span,.bt-pinned-snapshot .price .price-label{display:none}.bt-pinned-snapshot .newItemContainer .sockets{display:block}`
    document.head.append(style)
    style.textContent +=
        '.resultset > div.row.bt-scroll-target{background-image:linear-gradient(rgba(180,145,35,.16),rgba(180,145,35,.16))!important}'
    style.textContent +=
        '.bt-equivalent-pricings{color:#a38d6d}.bt-equivalent-pricings img{display:inline-block;height:20px;width:auto;vertical-align:middle}.results:not(.compact) .bt-equivalent-pricings{background:rgba(255,255,255,.1)}'
    let stopped = false
    let running = false
    let pending = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let scheduled: ReturnType<typeof setTimeout> | undefined
    function schedule() {
        if (stopped || scheduled !== undefined) return
        scheduled = setTimeout(() => {
            scheduled = undefined
            void process()
        }, 0)
    }
    const cleanups = new Map<HTMLElement, (() => void)[]>()
    function unpin(id: string) {
        useResultsStore
            .getState()
            .setPinned(useResultsStore.getState().pinned.filter((item) => item.id !== id))
    }
    async function process() {
        if (stopped) return
        if (running) {
            pending = true
            return
        }
        running = true
        try {
            const rows = Array.from(
                document.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]')
            ).filter((row) => !row.classList.contains('exchange'))
            if (!rows.length && useResultsStore.getState().pinned.length)
                useResultsStore.getState().setPinned([])
            for (const [row, disposers] of cleanups)
                if (!row.isConnected) {
                    disposers.forEach((dispose) => dispose())
                    cleanups.delete(row)
                }
            const disabled = useResultsStore.getState().disabled
            const context = currentLocation()
            let ratios: Record<string, number> = {}
            if (
                !disabled.includes('equivalent-pricings') &&
                context.league &&
                rows.some((row) => !cleanups.has(row))
            ) {
                try {
                    ratios = await client.fetchQuery({
                        queryKey: ['poe-ninja', 'ratios', context.version, context.league],
                        staleTime: 3600000,
                        retry: false,
                        queryFn: async () => {
                            const key = `poe-ninja-chaos-ratios-v2--${context.version}--${context.league.toLowerCase()}`
                            const cached = await getValue<Record<string, number>>(key)
                            if (cached) return cached
                            const data = (await browser.runtime.sendMessage({
                                query: 'currency-ratios',
                                version: context.version,
                                league: context.league,
                            })) as {
                                lines: { id: string; primaryValue: number }[]
                                items: { id: string; detailsId: string }[]
                            } | null
                            if (!data) throw new Error('Unable to fetch currency ratios')
                            const chaos =
                                data.lines.find(
                                    (line) => line.id === 'chaos' || line.id === 'chaos-orb'
                                )?.primaryValue ?? 1
                            const result = Object.fromEntries(
                                data.lines.map((line) => [
                                    slugify(
                                        data.items.find((item) => item.id === line.id)?.detailsId ??
                                            String(line.id)
                                    ),
                                    line.primaryValue / chaos,
                                ])
                            )
                            await browser.storage.local.set({
                                [key]: {
                                    value: result,
                                    expiresAt: new Date(Date.now() + 3600000).toUTCString(),
                                },
                            })
                            return result
                        },
                    })
                } catch {
                    if (!retryTimer)
                        retryTimer = setTimeout(() => {
                            retryTimer = undefined
                            if (stopped) return
                            for (const [row, disposers] of cleanups) {
                                disposers.forEach((dispose) => dispose())
                                row.removeAttribute('bt-enhanced')
                                row.removeAttribute('bt-regroup-state')
                            }
                            cleanups.clear()
                            void process()
                        }, 30000)
                }
            }
            if (stopped) return
            const needles = searchedStats().map(
                (stat) =>
                    new RegExp(
                        stat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/#/g, '[+\\-]?\\d+'),
                        'i'
                    )
            )
            let previousHash = ''
            let original: HTMLElement | undefined
            let group: HTMLElement[] = []
            for (const row of rows) {
                if (!cleanups.has(row)) {
                    const disposers: (() => void)[] = []
                    cleanups.set(row, disposers)
                    row.setAttribute('bt-enhanced', '')
                    const add = (node: HTMLElement, parent: Element) => {
                        parent.append(node)
                        disposers.push(() => node.remove())
                    }
                    const btns = row.querySelector('.details .btns')
                    if (btns) {
                        const button = document.createElement('button')
                        button.className = 'btn btn-default bt-pin-button'
                        button.textContent = 'Pin'
                        button.onclick = () => {
                            const id = row.dataset.id!
                            if (useResultsStore.getState().pinned.some((item) => item.id === id))
                                unpin(id)
                            else {
                                const node = document.createElement('div')
                                for (const selector of [
                                    '.middle',
                                    '.itemRendered',
                                    '.details .price',
                                ]) {
                                    const part = row.querySelector(selector)
                                    if (part) node.append(part.cloneNode(true))
                                }
                                node.querySelectorAll('script,iframe,object,button').forEach(
                                    (element) => element.remove()
                                )
                                useResultsStore
                                    .getState()
                                    .setPinned([
                                        ...useResultsStore.getState().pinned,
                                        { id, pinnedAt: new Date().toISOString(), node },
                                    ])
                                usePanelStore.getState().setPage('pinned-items')
                            }
                        }
                        add(button, btns)
                    }
                    if (!disabled.includes('highlight-stat-filters'))
                        row.querySelectorAll<HTMLElement>(
                            '.explicitMod,.pseudoMod,.implicitMod'
                        ).forEach((mod) => {
                            if (needles.some((needle) => needle.test(mod.textContent ?? ''))) {
                                mod.classList.add('bt-highlight-stat-filters')
                                disposers.push(() =>
                                    mod.classList.remove('bt-highlight-stat-filters')
                                )
                            }
                        })
                    if (!disabled.includes('maximum-sockets') && context.version === '1') {
                        const level = Number(
                            row.querySelector('.itemLevel')?.textContent?.match(/\d+/)?.[0]
                        )
                        const sockets = row.querySelectorAll('.sockets .socket').length
                        const threshold = [
                            { max: 2, level: 1 },
                            { max: 3, level: 24 },
                            { max: 4, level: 34 },
                            { max: 5, level: 49 },
                        ].find((value) => level <= value.level)
                        const frame = row.querySelector('.itemRendered')
                        if (
                            level &&
                            sockets &&
                            threshold &&
                            threshold.max > sockets &&
                            /\/BodyArmours\//.test(
                                row.querySelector<HTMLImageElement>('.icon img')?.src ?? ''
                            ) &&
                            frame
                        ) {
                            const warning = document.createElement('div')
                            warning.className = 'bt-maximum-sockets'
                            warning.textContent = `This item can have at most ${threshold.max} sockets`
                            add(warning, frame)
                        }
                    }
                    const price = row.querySelector('.price')
                    const amount = parseFloat(
                        row.querySelector('[data-field="price"] > br + span')?.textContent ?? ''
                    )
                    const currency = slugify(
                        row.querySelector('[data-field="price"] .currency-text span')
                            ?.textContent ?? ''
                    )
                    if (!disabled.includes('equivalent-pricings') && price && amount) {
                        const value = ratios[currency]
                        const divine = ratios['divine-orb']
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
                                [
                                    currency,
                                    {
                                        src: originalIcon?.src ?? '',
                                        alt: originalIcon?.alt || currency,
                                    },
                                ],
                            ])
                            const pattern = new RegExp(
                                `(${[...currencies.keys()]
                                    .sort((a, b) => b.length - a.length)
                                    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                                    .join('|')})`,
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
                        if (currency === 'chaos-orb' && divine && amount >= 0.5 * divine) {
                            append(`= ${Math.round((amount / divine) * 10) / 10} × divine`)
                        } else if (
                            currency !== 'chaos-orb' &&
                            value &&
                            Math.round(amount * value)
                        ) {
                            append(`= ${Math.round(amount * value)} × chaos`)
                            if (Math.floor(amount) && amount % 1 && value >= 1)
                                append(
                                    `= ${Math.floor(amount)} × ${currency} + ${Math.round((amount % 1) * value)} × chaos`
                                )
                        }
                    }
                }
                if (!disabled.includes('regroup-similars')) {
                    const hash = [
                        row.querySelector('.profile-link [href]')?.getAttribute('href'),
                        row.querySelector('.itemHeader')?.textContent?.replace(/superior/i, ''),
                        row.querySelector('.price')?.textContent,
                    ]
                        .join('')
                        .replace(/\s/g, '')
                        .toLowerCase()
                    if (hash !== previousHash) {
                        original = row
                        group = []
                        previousHash = hash
                    } else if (original) {
                        group.push(row)
                        let toggle = original.querySelector<HTMLButtonElement>('.bt-group-button')
                        if (!toggle) {
                            toggle = document.createElement('button')
                            toggle.className = 'btn btn-default bt-group-button'
                            toggle.dataset.state = 'hidden'
                            original.querySelector('.details .btns')?.append(toggle)
                            const node = toggle
                            cleanups.get(original)?.push(() => node.remove())
                        }
                        const members = [...group]
                        const button = toggle
                        const label = `${button.dataset.state === 'visible' ? 'Hide' : 'Show'} ${members.length} similar`
                        if (button.textContent !== label) button.textContent = label
                        row.setAttribute('bt-regroup-state', button.dataset.state ?? 'hidden')
                        button.onclick = () => {
                            const state = button.dataset.state === 'hidden' ? 'visible' : 'hidden'
                            button.dataset.state = state
                            members.forEach((member) =>
                                member.setAttribute('bt-regroup-state', state)
                            )
                            button.textContent = `${state === 'hidden' ? 'Show' : 'Hide'} ${members.length} similar`
                        }
                    }
                }
            }
        } finally {
            running = false
            if (pending) {
                pending = false
                schedule()
            }
        }
    }
    const observer = new MutationObserver(() => {
        if (
            Array.from(
                document.querySelectorAll<HTMLElement>(
                    '.resultset > div.row[data-id]:not([bt-enhanced])'
                )
            ).some((row) => !row.classList.contains('exchange')) ||
            !document.querySelector('.resultset > div.row')
        )
            schedule()
    })
    observer.observe(document.querySelector('#trade')?.parentElement ?? document.body, {
        childList: true,
        subtree: true,
    })
    const unsubscribe = useResultsStore.subscribe((state, old) => {
        if (state.disabled !== old.disabled) {
            for (const [row, disposers] of cleanups) {
                disposers.forEach((dispose) => dispose())
                row.removeAttribute('bt-enhanced')
                row.removeAttribute('bt-regroup-state')
            }
            cleanups.clear()
            void process()
        }
        for (const row of document.querySelectorAll<HTMLElement>('[bt-enhanced]')) {
            const pinned = state.pinned.some((item) => item.id === row.dataset.id)
            row.classList.toggle('bt-pinned', pinned)
            const button = row.querySelector('.bt-pin-button')
            if (button) button.textContent = pinned ? 'Unpin' : 'Pin'
        }
    })
    void process()
    return () => {
        stopped = true
        clearTimeout(retryTimer)
        clearTimeout(scheduled)
        observer.disconnect()
        unsubscribe()
        style.remove()
        for (const [row, disposers] of cleanups) {
            disposers.forEach((dispose) => dispose())
            row.removeAttribute('bt-enhanced')
            row.removeAttribute('bt-regroup-state')
            row.classList.remove('bt-pinned', 'bt-scroll-target')
        }
    }
}
