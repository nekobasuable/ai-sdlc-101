import { describe, expect, it } from 'vitest'
import { fromQuadrant, groupByQuadrant, QUADRANT_NAMES, secondQuadrantFirst, toQuadrant } from './quadrant'

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

describe('groupByQuadrant(四つに分ける、plan/022 B)', () => {
  it('4つの局面と、まだ分けていないものに分け、それぞれの順を保つ', () => {
    const items = [
      { id: 'a', quadrant: 1 },
      { id: 'b', quadrant: 2 },
      { id: 'c', quadrant: null },
      { id: 'd', quadrant: 2 },
      { id: 'e', quadrant: 4 },
    ]
    const { byQuadrant, unsorted } = groupByQuadrant(items)
    expect(byQuadrant[1].map((i) => i.id)).toEqual(['a'])
    expect(byQuadrant[2].map((i) => i.id)).toEqual(['b', 'd'])
    expect(byQuadrant[3]).toEqual([])
    expect(byQuadrant[4].map((i) => i.id)).toEqual(['e'])
    expect(unsorted.map((i) => i.id)).toEqual(['c'])
  })

  it('局面の名前は4つ', () => {
    expect(Object.values(QUADRANT_NAMES)).toEqual(['大切で急ぐ', '大切で急がない', '急ぐだけ', 'どちらでもない'])
  })
})
