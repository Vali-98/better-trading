import { expect, it } from 'vitest'
import { economyLeague, economyLeagueSlug } from './league'

it.each([
    ['poe2/Forbidden%20Rites', 'Forbidden Rites'],
    ['poe2/Forbidden Rites', 'Forbidden Rites'],
    ['Allflame', 'Allflame'],
    ['xbox/Allflame', undefined],
    ['sony/Standard', undefined],
    ['bad%zz', undefined],
])('normalizes trade league %s', (input, expected) => {
    expect(economyLeague(input)).toBe(expected)
})
it('builds ninja page slugs with hyphens for multiword leagues', () => {
    expect(economyLeagueSlug('Forbidden Rites')).toBe('forbidden-rites')
})
