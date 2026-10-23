export type SimilarGroupState = {
    previousHash: string
    original?: HTMLElement
    group: HTMLElement[]
}

export const createSimilarGroupState = (): SimilarGroupState => ({
    previousHash: '',
    group: [],
})

export function regroupSimilarRows(
    row: HTMLElement,
    state: SimilarGroupState,
    cleanups: Map<HTMLElement, (() => void)[]>
) {
    const hash = [
        row.querySelector('.profile-link [href]')?.getAttribute('href'),
        row.querySelector('.itemHeader')?.textContent?.replace(/superior/i, ''),
        row.querySelector('.price')?.textContent,
    ]
        .join('')
        .replace(/\s/g, '')
        .toLowerCase()
    if (hash !== state.previousHash) {
        state.original = row
        state.group = []
        state.previousHash = hash
        return
    }
    if (!state.original) return
    state.group.push(row)
    let toggle = state.original.querySelector<HTMLButtonElement>('.bt-group-button')
    if (!toggle) {
        toggle = document.createElement('button')
        toggle.className = 'btn btn-default bt-group-button'
        toggle.dataset.state = 'hidden'
        state.original.querySelector('.details .btns')?.append(toggle)
        const button = toggle
        cleanups.get(state.original)?.push(() => button.remove())
    }
    const members = [...state.group]
    const label =
        (toggle.dataset.state === 'visible' ? 'Hide' : 'Show') + ' ' + members.length + ' similar'
    if (toggle.textContent !== label) toggle.textContent = label
    row.setAttribute('bt-regroup-state', toggle.dataset.state ?? 'hidden')
    toggle.onclick = () => {
        const nextState = toggle.dataset.state === 'hidden' ? 'visible' : 'hidden'
        toggle.dataset.state = nextState
        members.forEach((member) => member.setAttribute('bt-regroup-state', nextState))
        toggle.textContent =
            (nextState === 'hidden' ? 'Show' : 'Hide') + ' ' + members.length + ' similar'
    }
}
