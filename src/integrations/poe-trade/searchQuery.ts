export async function searchItemName(slug: string | undefined, fallback: string) {
    if (!slug?.startsWith('H4sI')) return fallback.trim()
    try {
        const encoded = slug.replace(/-/g, '+').replace(/_/g, '/')
        const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
        const data = JSON.parse(await new Response(stream).text())
        const query = data.query ?? data
        const text = (value: unknown) =>
            typeof value === 'string'
                ? value
                : value &&
                    typeof value === 'object' &&
                    'option' in value &&
                    typeof value.option === 'string'
                  ? value.option
                  : ''
        return text(query.name) || text(query.type)
    } catch {
        return fallback.trim()
    }
}
