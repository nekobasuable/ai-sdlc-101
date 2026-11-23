import { describe, expect, it } from 'vitest'
import { addDays, weekStartOf } from './slot'
import { cellKey, slackRatio, weekGrid } from './week-grid'

const TOKYO = 'Asia/Tokyo'
// 2026-11-25(水)の東京の時刻を UTC の Date にする
const wed = (hh: number, mm = 0) => new Date(Date.UTC(2026, 10, 25, hh - 9, mm))

describe('weekStartOf / addDays', () => {
  it('夜中でも今週の月曜を返す', () => {
    expect(weekStartOf(wed(3), TOKYO)).toBe('2026-11-23')
  })

  it('月や年をまたいで日を足せる', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })
})

describe('weekGrid', () => {
  const grid = weekGrid('2026-11-23', wed(9, 30), TOKYO)

  it('7日 × 6ブロックの格子で、日付が入る', () => {
    expect(grid).toHaveLength(7)
    expect(grid.every((d) => d.length === 6)).toBe(true)
    expect(grid[2][0].date).toBe('2026-11-25')
  })

  it('昨日までは過去、明日からは未来', () => {
    expect(grid[1].every((c) => c.time === 'past')).toBe(true)
    expect(grid[3].every((c) => c.time === 'future')).toBe(true)
  })

  it('今日は、終わったブロックが過去、今のブロックが今、あとは未来', () => {
    expect(grid[2].map((c) => c.time)).toEqual(['past', 'now', 'future', 'future', 'future', 'future'])
  })

  it('来週はすべて未来', () => {
    expect(weekGrid('2026-11-30', wed(9), TOKYO).flat().every((c) => c.time === 'future')).toBe(true)
  })
})

describe('slackRatio', () => {
  const grid = weekGrid('2026-11-23', wed(9), TOKYO)

  it('何も置いていなければ、すべて余白', () => {
    expect(slackRatio(grid, new Set())).toBe(1)
  })

  it('置いたブロックの分だけ余白が減る', () => {
    const filled = new Set([cellKey(0, 'morning'), cellKey(0, 'noon'), cellKey(1, 'morning')])
    expect(slackRatio(grid, filled)).toBeCloseTo(39 / 42)
  })
})
