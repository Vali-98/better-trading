import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WebExtConfig } from 'wxt'

// Keep profiles outside WXT's generated directory so prepare/clean retains logins.
const chromiumProfile = resolve('.dev-profiles/chrome')
const firefoxProfile = resolve('.dev-profiles/firefox')
mkdirSync(chromiumProfile, { recursive: true })
mkdirSync(firefoxProfile, { recursive: true })

export default {
    chromiumProfile,
    firefoxProfile,
    keepProfileChanges: true,
} satisfies WebExtConfig
