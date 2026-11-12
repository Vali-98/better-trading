import { useEffect, useState } from 'react'
import { readBookmarkLeague } from '../../../integrations/poe-trade/bookmarkLeague'
import { subscribePageUpdates } from '../../../lib/page/updates'

export function useBookmarkLeague() {
    const [league, setLeague] = useState(readBookmarkLeague)
    useEffect(
        () =>
            subscribePageUpdates(({ context }) => {
                const next = context.bookmarkLeague
                setLeague((old) =>
                    old.league === next.league && old.warning === next.warning ? old : next
                )
            }, 'Bookmark league'),
        []
    )
    return league
}
