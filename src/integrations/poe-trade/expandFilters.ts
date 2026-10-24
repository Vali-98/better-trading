const expanding = new WeakSet<HTMLButtonElement>()

export function expandSearchFilters() {
    const button = document.querySelector<HTMLButtonElement>(
        'button.toggle-search-btn:has(.chevron.collapsed)'
    )
    if (!button || button.disabled || expanding.has(button)) return false
    expanding.add(button)
    button.click()
    // Vue updates the chevron asynchronously. Avoid toggling twice in one input event.
    queueMicrotask(() => expanding.delete(button))
    return true
}

const expandingGroups = new WeakSet<HTMLElement>()

export function expandFilterGroup(filter: HTMLElement) {
    expandSearchFilters()
    const group = filter.closest<HTMLElement>('.filter-group')
    if (!group || expandingGroups.has(group)) return
    const body = filter.closest<HTMLElement>('.filter-group-body')
    const toggle = Array.from(group.querySelectorAll<HTMLButtonElement>('button.toggle-btn')).find(
        (button) => button.closest('.filter-group') === group
    )
    if (!toggle) return
    const collapsed =
        group.classList.contains('collapsed') ||
        toggle.getAttribute('aria-expanded') === 'false' ||
        (body && (body.hidden || getComputedStyle(body).display === 'none'))
    if (collapsed) {
        expandingGroups.add(group)
        toggle.click()
        queueMicrotask(() => expandingGroups.delete(group))
    }
}

export function focusStatFilter(input: HTMLInputElement) {
    const expanded = expandSearchFilters()
    const focus = () => {
        if (!input.isConnected) return
        input.click()
        input.focus()
    }
    if (expanded) queueMicrotask(focus)
    else focus()
}
