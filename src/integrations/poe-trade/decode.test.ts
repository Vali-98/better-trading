import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeResultItems } from './decode'

it('normalizes representative captured items into the application model', () => {
    const payload = JSON.parse(
        readFileSync(new URL('./fixtures/items.json', import.meta.url), 'utf8')
    )
    const items = decodeResultItems(payload)
    expect(items).toHaveLength(2)
    expect(items[0].item.name).toBe('Mageblood')
    expect(items[1].item.baseType).toBe('Sadist Garb')
})
it('rejects malformed responses without leaking payloads into diagnostics', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(decodeResultItems({ privateData: 'secret' })).toEqual([])
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret')
    warn.mockRestore()
})
