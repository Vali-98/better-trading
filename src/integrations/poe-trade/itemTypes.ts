import { reportIntegrationIssue } from '../diagnostics'

interface ItemType {
    type?: string
    name?: string
    text: string
    disc: string
}
const cache = new Map<string, { expires: number; request: Promise<ItemType[]> }>()

async function itemTypes(version: '1' | '2') {
    const cached = cache.get(version)
    if (cached && cached.expires > Date.now()) return cached.request
    const request = (async () => {
        try {
            const origin =
                typeof location !== 'undefined' && /(^|\.)pathofexile\.com$/.test(location.hostname)
                    ? location.origin
                    : 'https://www.pathofexile.com'
            const url = new URL(`/api/trade${version === '2' ? '2' : ''}/data/items`, origin)
            const response = await fetch(url.href, {
                credentials: 'include',
                signal: AbortSignal.timeout(15000),
            })
            if (!response.ok) throw new Error('Item metadata unavailable')
            const data: unknown = await response.json()
            if (
                !data ||
                typeof data !== 'object' ||
                !('result' in data) ||
                !Array.isArray(data.result)
            )
                throw new Error('Invalid metadata')
            return data.result
                .flatMap((group) => (Array.isArray(group?.entries) ? group.entries : []))
                .filter(
                    (entry): entry is ItemType =>
                        entry &&
                        typeof entry.disc === 'string' &&
                        typeof entry.text === 'string' &&
                        (typeof entry.type === 'string' || typeof entry.name === 'string')
                )
        } catch {
            cache.delete(version)
            reportIntegrationIssue('poe-trade', 'Item variant metadata unavailable')
            return []
        }
    })()
    cache.set(version, { expires: Date.now() + 3_600_000, request })
    return request
}

export async function resolveItemType(option: string, discriminator: string, version: '1' | '2') {
    const entries = await itemTypes(version)
    return (
        entries.find(
            (entry) =>
                entry.disc === discriminator && (entry.type === option || entry.name === option)
        )?.text ?? ''
    )
}
