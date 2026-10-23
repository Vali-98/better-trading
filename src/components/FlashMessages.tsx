import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
export function FlashMessages() {
    const client = useQueryClient()
    const [messages, setMessages] = useState<{ id: number; error: boolean }[]>([])
    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>()
        const unsubscribe = client.getMutationCache().subscribe((event) => {
            if (
                event.type !== 'updated' ||
                (event.action.type !== 'success' && event.action.type !== 'error')
            )
                return
            if (event.action.type === 'success' && event.mutation.meta?.silentSuccess) return
            const id = Date.now() + Math.random()
            setMessages((items) => [...items, { id, error: event.action.type === 'error' }])
            const timer = setTimeout(() => {
                setMessages((items) => items.filter((item) => item.id !== id))
                timers.delete(timer)
            }, 4000)
            timers.add(timer)
        })
        return () => {
            unsubscribe()
            timers.forEach(clearTimeout)
        }
    }, [client])
    return (
        <div className="bt-flashes" aria-live="polite">
            {messages.map((message) => (
                <div key={message.id} className={message.error ? 'error' : ''}>
                    {message.error ? 'Oops! Something went wrong!' : 'Changes saved.'}
                </div>
            ))}
        </div>
    )
}
