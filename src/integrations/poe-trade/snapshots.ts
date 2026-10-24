export function clonePinnedItem(row: HTMLElement) {
    const node = document.createElement('div')
    for (const selector of ['.middle', '.itemRendered', '.details .price']) {
        const part = row.querySelector(selector)
        if (part) node.append(part.cloneNode(true))
    }
    node.querySelectorAll('script,iframe,object,button').forEach((element) => element.remove())
    return node
}
