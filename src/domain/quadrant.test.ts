import { describe, expect, it } from 'vitest'
import { fromQuadrant, secondQuadrantFirst, toQuadrant } from './quadrant'

describe('quadrant', () => {
  it('2つの問いから象限を決める。大切で急がないのは第2象限', () => {
    expect(toQuadrant({ important: true, urgent: true })).toBe(1)
    expect(toQuadrant({ important: true, urgent: false })).toBe(2)
    expect(toQuadrant({ important: false, urgent: true })).toBe(3)
    expect(toQuadrant({ important: false, urgent: false })).toBe(4)
  })

  it('象限から2つの答えに戻せる。未設定なら null', () => {
    for (const q of [1, 2, 3, 4] as const) expect(toQuadrant(fromQuadrant(q)!)).toBe(q)
    expect(fromQuadrant(null)).toBeNull()
  })

  it('第2象限を先に並べ、ほかの順は保つ', () => {
    const items = [{ id: 'a', quadrant: 1 }, { id: 'b', quadrant: 2 }, { id: 'c', quadrant: null }, { id: 'd', quadrant: 2 }]
    expect(secondQuadrantFirst(items).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  })
})
