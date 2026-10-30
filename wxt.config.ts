import type { UserConfig } from 'wxt'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { version } from './package.json'

export default {
    srcDir: 'src',
    modules: ['@wxt-dev/module-react'],
    zip: {
        name: 'better-trading',
        artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
        sourcesTemplate: '{{name}}-{{version}}-sources.zip',
        excludeSources: [
            '.env*',
            '**/.env*',
            '.dev-profiles/**',
            '.output/**',
            '.wxt/**',
            'node_modules/**',
            'web-ext.config.ts',
        ],
    },
    manifest: {
        name: 'Better PathOfExile Trading',
        description: 'Enhancements for Path of Exile trading.',
        permissions: ['storage'],
        host_permissions: ['https://poe.ninja/*'],
        web_accessible_resources: [
            {
                resources: [
                    'assets/images/*',
                    'item-capture.js',
                    'live-search.js',
                    'search-history.js',
                ],
                matches: ['*://*.pathofexile.com/*', '*://pathofexile.com/*'],
            },
        ],
        icons: { 128: 'assets/images/logo.png' },
        browser_specific_settings: {
            gecko: {
                id: process.env.FIREFOX_EXTENSION_ID || 'better-trading@example.com',
            },
        },
    },
    vite: async () => {
        const { default: tailwindcss } = await import('@tailwindcss/vite')
        return {
            plugins: [
                tailwindcss(),
                {
                    name: 'current-changelog',
                    resolveId(id) {
                        if (id === '#current-changelog?raw') return '\0current-changelog'
                    },
                    load(id) {
                        if (id === '\0current-changelog')
                            return `export default ${JSON.stringify(readFileSync(resolve(`changelogs/${version}.md`), 'utf8'))}`
                    },
                },
            ],
        }
    },
} satisfies UserConfig
