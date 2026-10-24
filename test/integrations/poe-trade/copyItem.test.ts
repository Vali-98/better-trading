// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import fixture from './fixtures/poe2-headhunter.html?raw'
import { enhanceCopyItem } from '../../../src/integrations/poe-trade/copyItem'
import { readItemText } from '../../../src/integrations/poe-trade/itemText'
let stop = () => {}
let row: HTMLElement
let button: HTMLButtonElement
beforeEach(() => {
    document.body.innerHTML = `<div class="row"><div class="left"><button class="copy hidden" style="display:none"></button></div>${fixture}</div>`
    row = document.querySelector('.row')!
    button = row.querySelector('button')!
})
afterEach(() => {
    stop()
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})
it('reconstructs the captured PoE2 item without advanced labels', () => {
    expect(readItemText(row)).toBe(
        [
            'Item Class: Belts',
            'Rarity: Unique',
            'Headhunter',
            'Heavy Belt',
            '--------',
            'Requirements:',
            'Level: 50',
            '--------',
            'Item Level: 81',
            '--------',
            '30% increased Stun Threshold (implicit)',
            'Has 1 Charm Slot (implicit)',
            '--------',
            '+49 to maximum Life',
            '+29 to Strength',
            '+21 to Dexterity',
            'When you kill a Rare monster, you gain its Modifiers for 60 seconds',
            '--------',
            'Corrupted',
            '--------',
            'Note: ~b/o 300 chaos',
        ].join('\n')
    )
})
it('copies hidden-button item text without invoking the empty native handler', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const native = vi.fn()
    button.addEventListener('click', native)
    stop = enhanceCopyItem(row, '2')
    button.click()
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith(readItemText(row))
    expect(native).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(button.title).toBe('Item copied'))
})
it.each(['1', '2'] as const)('preserves working native copying for PoE%s', (version) => {
    button.classList.remove('hidden')
    button.style.removeProperty('display')
    const native = vi.fn()
    button.addEventListener('click', native)
    stop = enhanceCopyItem(row, version)
    button.click()
    expect(native).toHaveBeenCalledTimes(1)
})
it('does not overwrite the clipboard when item markup is missing', () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    stop = enhanceCopyItem(row, '2')
    row.querySelector('.middle')!.remove()
    button.click()
    expect(writeText).not.toHaveBeenCalled()
})
it('cleans up fallback markers and listeners', () => {
    stop = enhanceCopyItem(row, '2')
    stop()
    expect(button.classList.contains('bt-copy-fallback')).toBe(false)
    const native = vi.fn()
    button.addEventListener('click', native)
    button.click()
    expect(native).toHaveBeenCalledTimes(1)
})

it('reports clipboard rejection and removes the legacy temporary field', async () => {
    vi.stubGlobal('navigator', {})
    const command = vi.fn(() => false)
    Object.defineProperty(document, 'execCommand', { value: command, configurable: true })
    stop = enhanceCopyItem(row, '2')
    button.click()
    await vi.waitFor(() => expect(button.title).toContain('Unable to copy item'))
    expect(document.querySelector('textarea')).toBeNull()
    delete (document as unknown as { execCommand?: unknown }).execCommand
})
