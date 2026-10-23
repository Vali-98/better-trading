import { existsSync, readFileSync } from 'node:fs'

const tag = process.argv[2]
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

if (!versionPattern.test(version)) throw new Error(`package.json version is not valid semver: ${version}`)
if (tag && tag !== `v${version}`)
    throw new Error(`Tag ${tag} must match package.json version v${version}`)
if (!existsSync(`changelogs/${version}.md`))
    throw new Error(`Missing changelog: changelogs/${version}.md`)

console.log(`Release metadata is valid for v${version}.`)
