import { resultRows } from '../integrations/poe-trade/results'
export function scrollToPinned(id: string) {
    const rows = resultRows(true)
    const target = rows.find((row) => row.dataset.id === id)
    if (!target) return
    for (const row of rows) row.classList.toggle('bt-scroll-target', row === target)
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
