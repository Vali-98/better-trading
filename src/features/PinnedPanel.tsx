import { useEffect, useId, useRef } from 'react'
import { useResultsStore } from '../stores/results'
import { scrollToPinned } from '../lib/scrollToPinned'
function Snapshot({ node }: { node: HTMLElement }) {
    const ref = useRef<HTMLSlotElement>(null)
    const name = useId()
    useEffect(() => {
        const shadow = ref.current?.getRootNode()
        if (!(shadow instanceof ShadowRoot)) return
        const clone = node.cloneNode(true) as HTMLElement
        clone.slot = name
        clone.classList.add('results')
        clone.classList.add('bt-pinned-snapshot')
        // Slotted host markup retains the trade site's item styles outside the panel's Shadow DOM.
        shadow.host.append(clone)
        return () => clone.remove()
    }, [node, name])
    return <slot name={name} ref={ref} />
}
export function PinnedPanel() {
    const { pinned, setPinned } = useResultsStore()
    return (
        <section>
            {!pinned.length && <p>No pinned items.</p>}
            {[...pinned]
                .sort((a, b) => b.pinnedAt.localeCompare(a.pinnedAt))
                .map((item) => (
                    <article key={item.id} className="bt-pinned-card">
                        <Snapshot node={item.node} />
                        <div className="bt-pinned-actions">
                            <button className="bt-button" onClick={() => scrollToPinned(item.id)}>
                                Scroll to item
                            </button>
                            <button
                                className="bt-button"
                                onClick={() =>
                                    setPinned(pinned.filter((value) => value.id !== item.id))
                                }>
                                Unpin
                            </button>
                        </div>
                    </article>
                ))}
            {Boolean(pinned.length) && (
                <button className="bt-button" onClick={() => setPinned([])}>
                    Clear pinned items
                </button>
            )}
            <p className="bt-notice">Pinned items are cleared when the search results reset.</p>
        </section>
    )
}
