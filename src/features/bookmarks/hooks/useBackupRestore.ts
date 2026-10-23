import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { importFolders } from '../../../lib/bookmarks/export'
import { bookmarkQueryKeys } from '../../../lib/bookmarks/queryKeys'

export function useBackupRestore(onSuccess: () => void) {
    const client = useQueryClient()
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const restore = async (text: string, full: boolean) => {
        setBusy(true)
        setError('')
        try {
            await importFolders(text, full)
            await client.invalidateQueries({ queryKey: bookmarkQueryKeys.all })
            onSuccess()
        } catch {
            setError('Unable to import. Check that the file or folder code is valid.')
        } finally {
            setBusy(false)
        }
    }
    return { busy, error, setError, restore }
}
