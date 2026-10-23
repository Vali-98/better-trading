export interface Release {
    id: string
    version: string
    legacy: boolean
    title: string
    markdown: string
}
export function loadReleases(files: Record<string, string>, currentVersion: string) {
    const releases = Object.entries(files).map(([path, markdown]): Release => {
        const legacy = path.includes('/legacy/')
        const id = path.split('/').pop()!.replace(/\.md$/, '')
        const version = legacy
            ? id
                  .match(/^(\d+)-(\d+)-(\d+)-/)
                  ?.slice(1)
                  .join('.')
            : id
        const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
        if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !title)
            throw new Error(`Invalid release metadata: ${path}`)
        if (!legacy && !/^## (Added|Changed|Fixed)\s*$/m.test(markdown))
            throw new Error(`Release ${id} needs an Added, Changed, or Fixed section`)
        return { id, version, legacy, title, markdown }
    })
    const ids = new Set<string>()
    for (const release of releases) {
        if (ids.has(release.id)) throw new Error(`Duplicate release: ${release.id}`)
        ids.add(release.id)
    }
    const current = releases.find(
        (release) => !release.legacy && release.version === currentVersion
    )
    if (!current) throw new Error(`Missing changelog for package version ${currentVersion}`)
    releases.sort((a, b) => {
        if (a.legacy !== b.legacy) return Number(a.legacy) - Number(b.legacy)
        const av = a.version.split('.').map(Number)
        const bv = b.version.split('.').map(Number)
        return bv[0] - av[0] || bv[1] - av[1] || bv[2] - av[2]
    })
    return { current, releases }
}
export function normalizeDismissed(value: string | null, releases: Release[]) {
    const release = releases.find((release) => release.id === value)
    return release ? `${release.legacy ? 'legacy:' : ''}${release.version}` : value
}
export function isDismissed(value: string | null, current: Release, releases: Release[]) {
    // A legacy dismissal does not dismiss the new rewrite, even if version numbers collide.
    if (releases.some((release) => release.legacy && release.id === value)) return false
    return normalizeDismissed(value, releases) === current.version
}
