import { browser } from 'wxt/browser'
import { reportIntegrationIssue } from '../diagnostics'

export interface TradeStat {
    id: string
    text: string
    type: string
}
const ttl = 86_400_000
const cache = new Map<string, { expires: number; request: Promise<TradeStat[]> }>()
function validEntries(value: unknown): value is TradeStat[] {
    return (
        Array.isArray(value) &&
        value.every(
            (entry) =>
                typeof entry?.id === 'string' &&
                typeof entry.text === 'string' &&
                typeof entry.type === 'string'
        )
    )
}
export async function tradeStatCatalog(version: '1' | '2') {
    const existing = cache.get(version)
    if (existing && existing.expires > Date.now()) return existing.request
    const request = (async () => {
        const key = `bt-trade-stat-catalog-v1--${version}`
        let stored: { value?: unknown; expiresAt?: number } | undefined
        try {
            const value = (await browser.storage.local.get(key))[key]
            if (value && typeof value === 'object' && 'value' in value)
                stored = {
                    value: value.value,
                    expiresAt:
                        'expiresAt' in value && typeof value.expiresAt === 'number'
                            ? value.expiresAt
                            : undefined,
                }
        } catch {
            /* Storage is optional. */
        }
        if (stored && validEntries(stored.value) && Number(stored.expiresAt) > Date.now())
            return stored.value
        try {
            const origin =
                typeof location !== 'undefined' && /(^|\.)pathofexile\.com$/.test(location.hostname)
                    ? location.origin
                    : 'https://www.pathofexile.com'
            const response = await fetch(
                new URL(`/api/trade${version === '2' ? '2' : ''}/data/stats`, origin).href,
                { credentials: 'include', signal: AbortSignal.timeout(15000) }
            )
            if (!response.ok) throw new Error('Stat metadata unavailable')
            const data: unknown = await response.json()
            if (
                !data ||
                typeof data !== 'object' ||
                !('result' in data) ||
                !Array.isArray(data.result)
            )
                throw new Error('Invalid stat metadata')
            const entries: TradeStat[] = data.result
                .flatMap((group) => (Array.isArray(group?.entries) ? group.entries : []))
                .filter(
                    (entry) =>
                        typeof entry?.id === 'string' &&
                        typeof entry?.text === 'string' &&
                        typeof entry?.type === 'string'
                )
                .map(({ id, text, type }) => ({ id, text, type }))
            try {
                await browser.storage.local.set({
                    [key]: { value: entries, expiresAt: Date.now() + ttl },
                })
            } catch {
                /* Use the in-memory catalog if storage is full. */
            }
            return entries
        } catch (error) {
            cache.delete(version)
            reportIntegrationIssue('poe-trade', 'Stat metadata unavailable')
            if (stored && validEntries(stored.value)) return stored.value
            throw error
        }
    })()
    cache.set(version, { expires: Date.now() + ttl, request })
    void request.catch(() => cache.delete(version))
    return request
}
export async function resolveTradeStat(text: string, version: '1' | '2') {
    const matches = (await tradeStatCatalog(version)).filter(
        (entry) => entry.type === 'explicit' && entry.text === text
    )
    return matches.length === 1 ? matches[0].id : undefined
}

export function canonicalStatText(text: string) {
    return text
        .toLowerCase()
        .replace(/\([\d.]+-[\d.]+\)|[+-]?\d+(?:\.\d+)?/g, '#')
        .replace(/flasks/g, 'flask')
        .replace(/effects/g, 'effect')
        .replace(/\bapply\b/g, 'applies')
        .replace(/\btheir\b/g, 'its')
        .replace(/\s+/g, ' ')
        .trim()
}
