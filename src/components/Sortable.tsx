import { createContext, useContext, type ReactNode } from 'react'
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const Handle = createContext<ReturnType<typeof useSortable> | null>(null)
export function SortableList({
    ids,
    children,
    onMove,
}: {
    ids: string[]
    children: ReactNode
    onMove: (from: number, to: number) => void
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id) {
                    const from = ids.indexOf(String(active.id))
                    const to = ids.indexOf(String(over.id))
                    if (from >= 0 && to >= 0) onMove(from, to)
                }
            }}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}
export function SortableItem({
    id,
    children,
    className = '',
}: {
    id: string
    children: ReactNode
    className?: string
}) {
    const sortable = useSortable({ id })
    return (
        <Handle.Provider value={sortable}>
            <div
                ref={sortable.setNodeRef}
                className={`${className} bt-sortable ${sortable.isDragging ? 'is-dragging' : ''}`}
                style={{
                    transform: CSS.Translate.toString(sortable.transform),
                    transition: sortable.transition,
                    position: 'relative',
                    zIndex: sortable.isDragging ? 20 : undefined,
                }}>
                {children}
            </div>
        </Handle.Provider>
    )
}
export function DragHandle({ label, children }: { label: string; children: ReactNode }) {
    const sortable = useContext(Handle)
    return (
        <button
            type="button"
            className="bt-drag"
            ref={sortable?.setActivatorNodeRef}
            {...sortable?.attributes}
            {...sortable?.listeners}
            aria-label={label}>
            {children}
        </button>
    )
}
