import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCKS } from './blocks'
import { aboutHours, letGo, timeSpent, type ReviewEntry } from './review'
import { weekGrid } from './week-grid'

const entry = (over: Partial<ReviewEntry> & { id?: string }): ReviewEntry => ({
  blockId: 'morning', // 3時間のブロック
  day: 0,
  result: 'done',
  item: { id: over.id ?? 'i', status: 'candidate', area: 'school', quadrant: 2, ...over.item },
  ...over,
})

describe('timeSpent', () => {
  it('終えたブロックは長さのまま、途中までは半分、手放したものは数えない', () => {
    const { byQuadrant } = timeSpent(
      [entry({ result: 'done' }), entry({ result: 'partial' }), entry({ result: 'not_done' }), entry({ result: null })],
      DEFAULT_BLOCKS,
    )
    expect(byQuadrant).toEqual([{ label: '大切で、急がないこと', minutes: 180 + 90 }])
  })

  it('領域別に、多い順に並べる。仕分けていないものは、そうとわかる言葉で', () => {
    const { byArea, byQuadrant } = timeSpent(
      [entry({ item: { id: 'a', status: 'done', area: 'work', quadrant: null } }), entry({ blockId: 'night', item: { id: 'b', status: 'done', area: 'school', quadrant: 1 } })],
      DEFAULT_BLOCKS,
    )
    expect(byArea.map((r) => r.label)).toEqual(['学校', '仕事'])
    expect(byQuadrant.map((r) => r.label)).toContain('仕分けていないこと')
  })
})

describe('aboutHours', () => {
  it('30分未満は「少し」、それ以上は「およそ N 時間」', () => {
    expect(aboutHours(20)).toBe('少し')
    expect(aboutHours(45)).toBe('およそ1時間')
    expect(aboutHours(270)).toBe('およそ5時間')
  })
})

describe('letGo', () => {
  // 2026-11-25(水)9:30 東京。月曜と火曜は過去
  const grid = weekGrid('2026-11-23', new Date(Date.UTC(2026, 10, 25, 0, 30)), 'Asia/Tokyo')

  it('手放したものと、結果のないまま過ぎたものを並べる。これからのものと完了した項目は除く', () => {
    const entries = [
      entry({ id: 'dropped', result: 'not_done' }),
      entry({ id: 'passed', result: null, day: 1 }),
      entry({ id: 'future', result: null, day: 4 }),
      entry({ id: 'done-item', result: 'not_done', item: { id: 'done-item', status: 'done', area: null, quadrant: null } }),
    ]
    expect(letGo(entries, grid).map((e) => e.item.id)).toEqual(['dropped', 'passed'])
  })

  it('同じ項目は1度だけ', () => {
    expect(letGo([entry({ id: 'x', result: 'not_done' }), entry({ id: 'x', result: 'not_done', day: 1 })], grid)).toHaveLength(1)
  })
})
