import { decodeResultItems } from '../integrations/poe-trade/decode'
import { afterEach, expect, it } from 'vitest'
import { useResultsStore } from './results'

afterEach(() => useResultsStore.setState({ items: new Map() }))

it('stores only validated naming fields keyed by result id', () => {
    useResultsStore.getState().receive(
        decodeResultItems([
            {
                id: 'one',
                item: {
                    name: 'Mageblood',
                    baseType: 'Heavy Belt',
                    typeLine: 'Heavy Belt',
                    frameType: 3,
                    account: 'ignored',
                },
            },
            { id: 'bad', item: { name: {} } },
        ])
    )
    expect([...useResultsStore.getState().items]).toEqual([
        [
            'one',
            { name: 'Mageblood', baseType: 'Heavy Belt', typeLine: 'Heavy Belt', frameType: 3 },
        ],
    ])
})

it('bounds retained results', () => {
    for (let batch = 0; batch < 21; batch++)
        useResultsStore.getState().receive(
            Array.from({ length: 100 }, (_, index) => ({
                id: String(batch * 100 + index),
                item: { name: '', baseType: 'Sadist Garb', typeLine: 'Sadist Garb', frameType: 2 },
            }))
        )
    expect(useResultsStore.getState().items.size).toBe(2000)
    expect(useResultsStore.getState().items.has('0')).toBe(false)
})
