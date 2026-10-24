export const shortcutDefinitions = [
    { title: 'Item Level', keys: ['il', 'ilvl', 'itemlevel'], kind: 'number' },
    { title: 'Quality', keys: ['q', 'qual', 'quality'], kind: 'number' },
    { title: 'Identified', keys: ['id', 'identified'], kind: 'choice' },
    { title: 'Vaal Gem', keys: ['vaalgem', 'vaal'], kind: 'choice' },
    { title: 'Corrupted', keys: ['corrupted', 'c'], kind: 'choice' },
    { title: 'Gem Level', keys: ['gl', 'gemlevel'], kind: 'choice' },
    { title: 'Fractured Item', keys: ['frac', 'fractureditem'], kind: 'choice' },
    { title: 'Synthesis Item', keys: ['synth', 'synthesisitem'], kind: 'choice' },
    { title: 'Searing Exarch', keys: ['exarch', 'searingexarch'], kind: 'choice' },
    { title: 'Eater of Worlds', keys: ['eater', 'eaterofworlds'], kind: 'choice' },
    { title: 'Mirrored', keys: ['mirrored'], kind: 'choice' },
    { title: 'Split', keys: ['split'], kind: 'choice' },
    { title: 'Crafted', keys: ['craft', 'crafted'], kind: 'choice' },
    { title: 'Veiled', keys: ['velt', 'veiled'], kind: 'choice' },
    { title: 'Vestigial', keys: ['vest', 'vestigial'], kind: 'choice' },
    { title: 'Memory Strands', keys: ['mem', 'memorystrands'], kind: 'number' },
    { title: 'Foulborn', keys: ['foul', 'foulborn'], kind: 'choice' },
    { title: 'Damage', keys: ['dmg', 'damage'], kind: 'number' },
    { title: 'Attacks per Second', keys: ['aps', 'attackspersecond'], kind: 'number' },
    {
        title: 'Critical Chance',
        keys: ['cc', 'criticalchance', 'criticalstrikechance'],
        kind: 'number',
    },
    { title: 'Damage per Second', keys: ['dps', 'damagepersecond'], kind: 'number' },
    { title: 'Physical DPS', keys: ['pdps', 'physicaldps'], kind: 'number' },
    { title: 'Elemental DPS', keys: ['edps', 'elementaldps'], kind: 'number' },
    { title: 'Armour', keys: ['ar', 'armour'], kind: 'number' },
    { title: 'Evasion', keys: ['ev', 'evasion', 'evasionrating'], kind: 'number' },
    { title: 'Energy Shield', keys: ['es', 'energyshield'], kind: 'number' },
    { title: 'Ward', keys: ['ward'], kind: 'number' },
    { title: 'Block', keys: ['block'], kind: 'number' },
    {
        title: 'Base Percentile',
        keys: ['bp', 'basepercentile', 'basedefencepercentile'],
        kind: 'number',
    },
    { title: 'Sockets', keys: ['soc', 'sockets'], kind: 'sockets' },
] as const

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
        'Enable **Search filter shortcuts** in Settings. Type a shortcut in the item search and press Space to apply it. Both `;` and `:` separators work, for example `il;40` or `il:40`. Applied shortcuts disappear and expand their filter subsection; the rest of your search stays. This enhancer works independently of tilde autofill.',
        '',
        '<table><thead><tr><th>Filter</th><th>Supported keys</th><th>Examples</th></tr></thead><tbody>',
        ...shortcutDefinitions.map(
            ({ title, keys, kind }) =>
                `<tr><td>${title}</td><td>${keys.map((key) => `<code>${key}</code>`).join(', ')}</td><td>${
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
        'Type `;clear` or `:clear` followed by Space to activate the site’s Clear button and reset the search and all filters.',
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
        '- Socket counts must be whole numbers from zero to six, with at most six sockets in total.',
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
