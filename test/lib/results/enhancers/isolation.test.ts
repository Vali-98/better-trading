// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { disposeEnhancer, installEnhancer } from '../../../../src/lib/results/enhancers/isolation'
it('continues rollback and remaining cleanup when an individual disposer throws', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const parent = document.createElement('div')
    const disposers: (() => void)[] = []
    const cleaned = vi.fn()
    installEnhancer('Failing example', disposers, (add, cleanup) => {
        add(document.createElement('span'), parent)
        cleanup(() => {
            throw new Error('Cleanup failed')
        })
        throw new Error('Installation failed')
    })
    expect(parent.childNodes).toHaveLength(0)
    installEnhancer('Healthy example', disposers, (_add, cleanup) => {
        cleanup(() => {
            throw new Error('Cleanup failed')
        })
        cleanup(cleaned)
    })
    disposers.forEach(disposeEnhancer)
    expect(cleaned).toHaveBeenCalledOnce()
    warning.mockRestore()
})
