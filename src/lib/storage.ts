import { browser } from 'wxt/browser'

interface Envelope<T> {
    value: T
    expiresAt: string | null
}
export async function getValue<T>(key: string): Promise<T | null> {
    const result = await browser.storage.local.get(key)
    const payload = result[key] as Envelope<T> | undefined
    if (!payload || (payload.expiresAt && Date.parse(payload.expiresAt) < Date.now())) return null
    return payload.value
}
export async function setValue<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: { value, expiresAt: null } })
}
