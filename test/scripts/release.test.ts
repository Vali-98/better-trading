import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
const script = '../../scripts/release.mjs'
const { release } = await import(script)
const roots: string[] = []
afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
function fixture(next?: string) {
    const root = mkdtempSync(join(tmpdir(), 'bt-release-'))
    roots.push(root)
    const git = (...args: string[]) =>
        execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
    git('init', '-b', 'master')
    git('config', 'user.name', 'Release test')
    git('config', 'user.email', 'release@example.invalid')
    git('config', 'commit.gpgsign', 'false')
    git('config', 'tag.gpgsign', 'false')
    git('config', 'core.hooksPath', join(root, 'no-hooks'))
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'test', version: '0.1.3' }))
    writeFileSync(
        join(root, 'package-lock.json'),
        JSON.stringify({ version: '0.1.3', packages: { '': { version: '0.1.3' } } })
    )
    if (next) {
        mkdirSync(join(root, 'changelogs'))
        writeFileSync(join(root, `changelogs/${next}.md`), '# Release\n\n## Added\n\n- Example.\n')
    }
    git('add', '.')
    git('commit', '-m', 'Initial')
    return { root, git }
}
it('rejects a missing next changelog without modifying versions or Git', () => {
    const { root, git } = fixture()
    const head = git('rev-parse', 'HEAD')
    expect(() => release(root, ['patch', '-y'])).toThrow('Create changelogs/0.1.4.md')
    expect(git('rev-parse', 'HEAD')).toBe(head)
    expect(git('status', '--porcelain')).toBe('')
    expect(git('tag', '--list')).toBe('')
})
it.each([
    ['patch', '0.1.4'],
    ['minor', '0.2.0'],
    ['major', '1.0.0'],
])('prepares a local %s release without pushing', (bump, version) => {
    const { root, git } = fixture(version)
    release(root, [bump])
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version).toBe(version)
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
    expect(lock.version).toBe(version)
    expect(lock.packages[''].version).toBe(version)
    expect(git('cat-file', '-t', `v${version}`)).toBe('tag')
    expect(git('status', '--porcelain')).toBe('')
})
it('rejects dirty worktrees and feature branches before changing version files', () => {
    const { root, git } = fixture('0.1.4')
    writeFileSync(join(root, 'unfinished.txt'), 'work')
    expect(() => release(root, ['patch'])).toThrow('Commit all changes')
    rmSync(join(root, 'unfinished.txt'))
    git('switch', '-c', 'feature')
    expect(() => release(root, ['patch'])).toThrow('Release from master or main')
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version).toBe('0.1.3')
})
it('pushes the release commit and tag with -y to a local test remote', () => {
    const { root, git } = fixture('0.1.4')
    const remote = mkdtempSync(join(tmpdir(), 'bt-release-remote-'))
    roots.push(remote)
    execFileSync('git', ['init', '--bare', remote])
    git('remote', 'add', 'origin', remote)
    git('push', 'origin', 'master')
    release(root, ['patch', '-y'])
    expect(git('ls-remote', 'origin', 'refs/heads/master')).toContain(git('rev-parse', 'HEAD'))
    expect(git('ls-remote', 'origin', 'refs/tags/v0.1.4')).toContain(git('rev-parse', 'v0.1.4'))
})
