import { expect, it } from 'vitest'
import { loadReleases, isDismissed, normalizeDismissed } from '../../../src/lib/releases/model'
const note = '# Release\n\n## Fixed\n\n- A fix.\n'
it('requires an entry for the package version and validates titles and sections', () => {
    expect(() => loadReleases({}, '0.1.0')).toThrow('Missing changelog')
    expect(() => loadReleases({ '/0.1.0.md': 'bad' }, '0.1.0')).toThrow('Invalid release')
    expect(() => loadReleases({ '/0.1.0.md': '# Title' }, '0.1.0')).toThrow('needs an Added')
    expect(() => loadReleases({ '/oops.md': note }, '0.1.0')).toThrow('Invalid release')
})
it('orders numeric versions within the rewrite and legacy histories separately', () => {
    const { current, releases } = loadReleases(
        {
            '/0.1.0.md': note,
            '/0.10.0.md': note,
            '/0.2.0.md': note,
            '/legacy/1-9-2-mercenaries-2.md': '# Old',
            '/legacy/1-8-0-poe2-ea-1.md': '# Older',
        },
        '0.1.0'
    )
    expect(current.version).toBe('0.1.0')
    expect(releases.map((release) => release.version)).toEqual([
        '0.10.0',
        '0.2.0',
        '0.1.0',
        '1.9.2',
        '1.8.0',
    ])
})
it('migrates a legacy dismissal without hiding the rewrite and only dismisses the selected release', () => {
    const { current, releases } = loadReleases(
        { '/0.1.0.md': note, '/legacy/1-9-0-poe2-ea-2.md': '# Old' },
        '0.1.0'
    )
    expect(normalizeDismissed('1-9-0-poe2-ea-2', releases)).toBe('legacy:1.9.0')
    expect(isDismissed('1-9-0-poe2-ea-2', current, releases)).toBe(false)
    expect(isDismissed('legacy:1.9.0', current, releases)).toBe(false)
    expect(isDismissed('0.1.0', current, releases)).toBe(true)
    expect(isDismissed('0.0.9', current, releases)).toBe(false)
    expect(isDismissed(null, current, releases)).toBe(false)
})
it('rejects duplicate release IDs', () => {
    expect(() => loadReleases({ '/a/0.1.0.md': note, '/b/0.1.0.md': note }, '0.1.0')).toThrow(
        'Duplicate release'
    )
})
