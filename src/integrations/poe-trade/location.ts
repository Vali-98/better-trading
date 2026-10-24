export function currentLocation(pathname = location.pathname) {
    const parts = pathname.split('/').slice(1)
    const version = parts[0] === 'trade2' ? '2' : '1'
    const realm = ['xbox', 'sony', 'poe2'].includes(parts[2])
    return {
        version: version as '1' | '2',
        type: parts[1],
        league: realm ? `${parts[2]}/${parts[3]}` : parts[2],
        slug: parts[realm ? 4 : 3],
    }
}
