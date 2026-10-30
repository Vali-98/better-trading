import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { loadReleases } from '../src/lib/releases/model.ts'

export function release(root, args) {
    const [bump, ...flags] = args
    if (
        !['patch', 'minor', 'major'].includes(bump) ||
        flags.some((flag) => flag !== '-y') ||
        flags.length > 1
    )
        throw new Error('Usage: npm run release -- patch|minor|major [-y]')
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
    const read = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'))
    const pkg = read('package.json')
    if (!/^\d+\.\d+\.\d+$/.test(pkg.version))
        throw new Error('Release bumps require a stable major.minor.patch version.')
    const parts = pkg.version.split('.').map(Number)
    const index = ['major', 'minor', 'patch'].indexOf(bump)
    parts[index]++
    parts.fill(0, index + 1)
    const version = parts.join('.')
    const tag = `v${version}`
    const changelog = `changelogs/${version}.md`
    // Validate the future release before touching Git or version files.
    if (!existsSync(resolve(root, changelog)))
        throw new Error(`Create ${changelog} before releasing.`)
    loadReleases({ [changelog]: readFileSync(resolve(root, changelog), 'utf8') }, version)
    if (git('status', '--porcelain'))
        throw new Error('Commit all changes, including the new changelog, before releasing.')
    const branch = git('branch', '--show-current')
    if (!['master', 'main'].includes(branch))
        throw new Error('Release from master or main after merging your changes.')
    if (git('tag', '--list', tag)) throw new Error(`Tag ${tag} already exists.`)
    const lock = read('package-lock.json')
    if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version)
        throw new Error('package.json and package-lock.json versions must match.')
    const push = flags.includes('-y')
    if (push) {
        if (git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`).length)
            throw new Error(`Tag ${tag} already exists on origin.`)
        git('fetch', 'origin', branch)
        if (git('merge-base', 'HEAD', 'FETCH_HEAD') !== git('rev-parse', 'FETCH_HEAD'))
            throw new Error(
                'Local branch is behind or diverged from origin. Update it before releasing.'
            )
    }
    const write = (file, data) => {
        const original = readFileSync(resolve(root, file), 'utf8')
        const indent = original.match(/\n([\t ]+)"/)?.[1] ?? '    '
        writeFileSync(resolve(root, file), JSON.stringify(data, null, indent) + '\n')
    }
    pkg.version = lock.version = lock.packages[''].version = version
    write('package.json', pkg)
    write('package-lock.json', lock)
    git('add', '--', 'package.json', 'package-lock.json')
    git('commit', '-m', `chore: release ${tag}`, '--', 'package.json', 'package-lock.json')
    git('tag', '-a', tag, '-m', tag)
    console.log(`Created release commit and annotated tag ${tag}.`)
    if (push) {
        // Publish the branch and tag together, or neither; GitHub builds the archives.
        git('push', '--atomic', 'origin', `HEAD:refs/heads/${branch}`, `refs/tags/${tag}`)
        console.log('Pushed. GitHub Actions will build and publish the release archives.')
    } else
        console.log(
            `To publish: git push --atomic origin HEAD:refs/heads/${branch} refs/tags/${tag}`
        )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        release(resolve(import.meta.dirname, '..'), process.argv.slice(2))
    } catch (error) {
        console.error(error.message)
        console.error(
            'Release stopped. If a Git step failed, inspect git status and local tags before retrying.'
        )
        process.exitCode = 1
    }
}
