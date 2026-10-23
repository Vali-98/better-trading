import type { AddNode } from './types'

export function addSocketWarning(row: HTMLElement, add: AddNode) {
    const level = Number(row.querySelector('.itemLevel')?.textContent?.match(/\d+/)?.[0])
    const sockets = row.querySelectorAll('.sockets .socket').length
    const threshold = [
        { max: 2, level: 1 },
        { max: 3, level: 24 },
        { max: 4, level: 34 },
        { max: 5, level: 49 },
    ].find((value) => level <= value.level)
    const frame = row.querySelector('.itemRendered')
    if (
        !level ||
        !sockets ||
        !threshold ||
        threshold.max <= sockets ||
        !/\/BodyArmours\//.test(row.querySelector<HTMLImageElement>('.icon img')?.src ?? '') ||
        !frame
    )
        return
    const warning = document.createElement('div')
    warning.className = 'bt-maximum-sockets'
    warning.textContent = 'This item can have at most ' + threshold.max + ' sockets'
    add(warning, frame)
}
