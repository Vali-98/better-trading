import { decodeSearchQuery } from './encodedQuery'
import { resolveItemType } from './itemTypes'

export async function searchItemName(
    slug: string | undefined,
    fallback: string,
    version: '1' | '2' = '1'
) {
    if (!slug?.startsWith('H4sI')) return fallback.trim()
    try {
        const query = await decodeSearchQuery(slug)
        const text = (value: unknown) =>
            typeof value === 'string'
                ? value
                : value &&
                    typeof value === 'object' &&
                    'option' in value &&
                    typeof value.option === 'string'
                  ? value.option
                  : ''
        for (const value of [query.name, query.type]) {
            const option = text(value)
            if (!option) continue
            if (
                value &&
                typeof value === 'object' &&
                'discriminator' in value &&
                typeof value.discriminator === 'string'
            )
                return resolveItemType(option, value.discriminator, version)
            return option
        }
        return ''
    } catch {
        return fallback.trim()
    }
}
