import {
    filterDefinitions,
    forGame,
    type FilterId,
} from '../integrations/poe-trade/filterDefinitions'
import type { PerGame } from '../models/search'

export type ShortcutTitle = PerGame<string>
export const resolveShortcutTitle = forGame<string>
function referenceTitle(title: ShortcutTitle) {
    return typeof title === 'string' ? title : `${title.poe1} (PoE1) / ${title.poe2} (PoE2)`
}
const shortcuts = [
    { filter: 'itemLevel', keys: ['il', 'ilvl', 'itemlevel'] },
    { filter: 'quality', keys: ['q', 'qual', 'quality'] },
    { filter: 'identified', keys: ['id', 'identified'] },
    { filter: 'vaalGem', keys: ['vaalgem', 'vaal'] },
    { filter: 'corrupted', keys: ['corrupted', 'c'] },
    { filter: 'gemLevel', keys: ['gl', 'gemlevel'] },
    { filter: 'fractured', keys: ['frac', 'fractureditem'] },
    { filter: 'synthesis', keys: ['synth', 'synthesisitem'] },
    { filter: 'exarch', keys: ['exarch', 'searingexarch'] },
    { filter: 'eater', keys: ['eater', 'eaterofworlds'] },
    { filter: 'mirrored', keys: ['mirrored'] },
    { filter: 'split', keys: ['split'] },
    { filter: 'crafted', keys: ['craft', 'crafted'] },
    { filter: 'veiled', keys: ['velt', 'veiled'] },
    { filter: 'vestigial', keys: ['vest', 'vestigial'] },
    { filter: 'memoryStrands', keys: ['mem', 'memorystrands'] },
    { filter: 'foulborn', keys: ['foul', 'foulborn'] },
    { filter: 'damage', keys: ['dmg', 'damage'] },
    { filter: 'attacksPerSecond', keys: ['aps', 'attackspersecond'] },
    { filter: 'criticalChance', keys: ['cc', 'criticalchance', 'criticalstrikechance'] },
    { filter: 'dps', keys: ['dps', 'damagepersecond'] },
    { filter: 'physicalDps', keys: ['pdps', 'physicaldps'] },
    { filter: 'elementalDps', keys: ['edps', 'elementaldps'] },
    { filter: 'armour', keys: ['ar', 'armour'] },
    { filter: 'evasion', keys: ['ev', 'evasion', 'evasionrating'] },
    { filter: 'energyShield', keys: ['es', 'energyshield'] },
    { filter: 'ward', keys: ['ward'] },
    { filter: 'block', keys: ['block'] },
    { filter: 'basePercentile', keys: ['bp', 'basepercentile', 'basedefencepercentile'] },
    { filter: 'links', keys: ['link', 'links', 'linkgroups'] },
    { filter: 'sockets', keys: ['soc', 'sockets'] },
] as const satisfies readonly { filter: FilterId; keys: readonly string[] }[]
// Reference labels and value kinds come from the same catalog used by all callers.
export const shortcutDefinitions = shortcuts.map((shortcut) => ({
    ...filterDefinitions[shortcut.filter],
    ...shortcut,
}))

export const shortcutChoices: Record<string, string> = {
    y: 'yes',
    yes: 'yes',
    n: 'no',
    no: 'no',
    a: 'any',
    any: 'any',
}

export const normalizeFilterTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export function searchShortcutsMarkdown() {
    return [
        '# Search shortcuts',
        '',
        'Enable **Search filter shortcuts** in Settings. Type a shortcut in the item search and press Space or Enter to apply it. Enter consumes applied shortcuts without submitting the search; press Enter again to search. Both `;` and `:` separators work, for example `il;40` or `il:40`. Applied shortcuts disappear and expand their filter subsection; the rest of your search stays. This enhancer works independently of tilde autofill.',
        '',
        '<table><thead><tr><th>Filter</th><th>Supported keys</th><th>Examples</th></tr></thead><tbody>',
        ...shortcutDefinitions.map(
            ({ title, keys, kind }) =>
                `<tr><td>${referenceTitle(title)}</td><td>${keys.map((key) => `<code>${key}</code>`).join(', ')}</td><td>${
                    kind === 'sockets'
                        ? '<code>soc;6w</code>, <code>soc;1b2g1r</code>, <code>soc;6</code>'
                        : kind === 'number'
                          ? `<code>${keys[0]};40</code>, <code>${keys[0]};30-90</code>, <code>${keys[0]};-90</code>`
                          : `<code>${keys[0]};y</code>, <code>${keys[0]};n</code>, <code>${keys[0]};a</code>`
                }</td></tr>`
        ),
        '',
        '</tbody></table>',
        '',
        '## Clear all filters',
        '',
        'Type `;clear` or `:clear` followed by Space or Enter to activate the site’s Clear button and reset the search and all filters.',
        '',
        '## Numeric values',
        '',
        '- `key;40` sets minimum 40 and clears maximum.',
        '- `key;30-90` sets minimum 30 and maximum 90.',
        '- `key;-90` sets maximum 90 and clears minimum.',
        '- `key;40-` sets minimum 40 and clears maximum.',
        '- Decimal values are supported. Reversed ranges are left untouched.',
        '- Item Level also accepts `il40`, `il30-90`, `ilvl40` and `ilvl30-90` without a separator.',
        '',
        '## Sockets',
        '',
        '- `soc;6w` sets six white sockets.',
        '- `soc;1b2g1r` sets one blue, two green and one red socket. Colors can appear in any order: `soc;2b1g` and `soc;1g2b` are equivalent.',
        '- Repeated colors are added together; omitted colors and previous total limits are cleared.',
        '- `soc;6` sets minimum six sockets and clears color requirements. Numeric ranges such as `soc;4-6` also work.',
        '- PoE1 socket counts must be whole numbers from zero to six, with at most six sockets in total. Color requirements apply to PoE1; on PoE2, `soc` sets the Augmentable Sockets numeric range.',
        '',
        '## Yes / No / Any values',
        '',
        ...['yes', 'no', 'any'].map(
            (choice) =>
                `- ${Object.entries(shortcutChoices)
                    .filter(([, value]) => value === choice)
                    .map(([key]) => `\`${key}\``)
                    .join(' or ')} selects **${choice[0].toUpperCase() + choice.slice(1)}**.`
        ),
        '',
        '## Other filters',
        '',
        'Any available numeric or Yes/No/Any property filter can use its full title with spaces and punctuation removed, for example `vaalgem;y`. Keys and values are case insensitive. The matching filter must exist on the current trade page; unavailable, disabled, invalid or incomplete shortcuts stay in your search. A warning appears below the search bar when a filter or choice is unavailable on the current page, including filters missing from PoE1 or PoE2.',
        '',
    ].join('\n')
}
