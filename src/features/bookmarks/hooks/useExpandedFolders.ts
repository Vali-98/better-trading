import { preferences } from '../../../lib/preferences'
import { useState } from 'react'

const storageKey = 'bt-bookmark-folders-expansion'

export function useExpandedFolders() {
    const [expanded, setExpanded] = useState(() =>
        (preferences.getItem(storageKey) ?? '').split(',').filter(Boolean)
    )

    const setAndPersist = (ids: string[]) => {
        setExpanded(ids)
        preferences.setItem(storageKey, ids.join(','))
    }

    const toggle = (id: string) =>
        setAndPersist(
            expanded.includes(id) ? expanded.filter((item) => item !== id) : [...expanded, id]
        )

    return { expanded, setExpanded: setAndPersist, toggle }
}
