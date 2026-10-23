import { existsSync, readFileSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
const browser = process.argv[2]
if (!['chrome', 'firefox'].includes(browser)) throw new Error('Choose chrome or firefox.')
if (existsSync('.env.release')) loadEnvFile('.env.release')
const prefix = browser.toUpperCase()
const keys =
    browser === 'chrome'
        ? ['EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN']
        : ['EXTENSION_ID', 'JWT_ISSUER', 'JWT_SECRET']
const missing = keys.map((key) => `${prefix}_${key}`).filter((key) => !process.env[key]?.trim())
if (missing.length) {
    console.error(`Fill in .env.release: ${missing.join(', ')}`)
    process.exit(1)
}
//if (browser === 'firefox' && process.env.FIREFOX_EXTENSION_ID === 'better-trading@example.com')
//    throw new Error('Use the real AMO add-on ID, not the development placeholder.')
if (process.argv.includes('--check')) {
    console.log(`${browser}: required credential fields present. No network calls made.`)
    process.exit(0)
}
function run(args) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        stdio: 'inherit',
        env: process.env,
    })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status ?? 1)
}
run(['run', 'typecheck'])
run(['test'])
run(['run', browser === 'chrome' ? 'zip' : 'zip:firefox'])
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const zip = resolve(`.output/better-trading-${version}-${browser}.zip`)
const args = ['exec', '--', 'wxt', 'submit', `--${browser}-zip`, zip]
if (browser === 'chrome') args.push('--chrome-skip-submit-review')
else {
    const manifest = JSON.parse(readFileSync('.output/firefox-mv2/manifest.json', 'utf8'))
    if (manifest.browser_specific_settings?.gecko?.id !== process.env.FIREFOX_EXTENSION_ID)
        throw new Error('Built Firefox add-on ID does not match FIREFOX_EXTENSION_ID.')
    args.push(
        '--firefox-sources-zip',
        resolve(`.output/better-trading-${version}-sources.zip`),
        '--firefox-channel',
        'listed'
    )
}
// Only the selected archive may activate a store upload, even if the caller has
// old archive paths in their environment.
for (const key of ['CHROME_ZIP', 'FIREFOX_ZIP', 'EDGE_ZIP']) delete process.env[key]
console.log(
    browser === 'chrome'
        ? 'Uploading Chrome draft; review/publication remains manual.'
        : 'Submitting Firefox add-on and source archive to AMO review.'
)
run(args)
