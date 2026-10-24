export async function decodeSearchQuery(slug: string) {
    const encoded = slug.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    const data = JSON.parse(await new Response(stream).text())
    const query: unknown = data.query ?? data
    if (!query || typeof query !== 'object' || Array.isArray(query))
        throw new Error('Invalid search query')
    return query as Record<string, unknown>
}

export async function encodeSearchQuery(query: Record<string, unknown>) {
    const compressed = new Blob([JSON.stringify(query)])
        .stream()
        .pipeThrough(new CompressionStream('gzip'))
    const bytes = new Uint8Array(await new Response(compressed).arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
