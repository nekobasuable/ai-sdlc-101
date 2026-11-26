import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCKS } from './blocks'
import { DEFAULT_PILLARS } from './pillars'
import { aboutHours, letGo, timeSpent, type ReviewEntry } from './review'
import { weekGrid } from './week-grid'

const entry = (over: Partial<ReviewEntry> & { id?: string }): ReviewEntry => ({
  blockId: 'morning', // 3時間のブロック
  day: 0,
  result: 'done',
  item: { id: over.id ?? 'i', status: 'candidate', area: 'learning', quadrant: 2, ...over.item },
  ...over,
})

describe('timeSpent', () => {
  it('終えたブロックは長さのまま、途中までは半分、手放したものは数えない', () => {
    const { byQuadrant } = timeSpent(
      [entry({ result: 'done' }), entry({ result: 'partial' }), entry({ result: 'not_done' }), entry({ result: null })],
      DEFAULT_BLOCKS,
      DEFAULT_PILLARS,
    )
    expect(byQuadrant).toEqual([{ label: '大切で、急がないこと', minutes: 180 + 90, count: 2 }])
  })

  it('人生の柱ごとに、多い順に並べ、回数も数える。仕分けていないものは、そうとわかる言葉で', () => {
    const { byArea, byQuadrant } = timeSpent(
      [
        entry({ item: { id: 'a', status: 'done', area: 'work', quadrant: null } }),
        entry({ blockId: 'night', item: { id: 'b', status: 'done', area: 'health', quadrant: 1 } }),
        entry({ blockId: 'early', item: { id: 'c', status: 'done', area: 'health', quadrant: 1 } }),
        entry({ blockId: 'noon', item: { id: 'd', status: 'done', area: 'gone', quadrant: 1 } }),
      ],
      DEFAULT_BLOCKS,
      DEFAULT_PILLARS,
    )
    expect(byArea.map((r) => [r.label, r.count])).toEqual([
      ['健康', 2],
      ['仕事', 1],
      ['柱を決めていないこと', 1],
    ])
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

  it('選び直した項目(やることに戻した、いつかにした)は出さない', () => {
    const entries = [
      entry({ id: 'back', result: 'not_done', item: { id: 'back', status: 'inbox', area: null, quadrant: null } }),
      entry({ id: 'later', result: null, day: 1, item: { id: 'later', status: 'someday', area: null, quadrant: null } }),
      entry({ id: 'still', result: 'not_done' }),
    ]
    expect(letGo(entries, grid).map((e) => e.item.id)).toEqual(['still'])
  })

  it('同じ項目は1度だけ', () => {
    expect(letGo([entry({ id: 'x', result: 'not_done' }), entry({ id: 'x', result: 'not_done', day: 1 })], grid)).toHaveLength(1)
  })
})
