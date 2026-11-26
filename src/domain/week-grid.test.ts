import { describe, expect, it } from 'vitest'
import { addDays, weekStartOf } from './slot'
import { cellKey, daysGrid, slackRatio, todayOf, weekdayOf, weekGrid, weeksCovering } from './week-grid'

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
    const filled = new Set([cellKey('2026-11-23', 'morning'), cellKey('2026-11-23', 'noon'), cellKey('2026-11-24', 'morning')])
    expect(slackRatio(grid, filled)).toBeCloseTo(39 / 42)
  })
})

describe('daysGrid(今日から7日、plan/019)', () => {
  // 2026-11-27(金)から7日: 金土日 / 月火水木。暦の週を2つまたぐ
  const grid = daysGrid('2026-11-27', new Date(Date.UTC(2026, 10, 27, 10 - 9)), TOKYO)

  it('初日から7日分を並べ、それぞれの暦の週と曜日を持つ', () => {
    expect(grid.map((d) => d[0].date)).toEqual(['2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'])
    expect(grid.map((d) => d[0].weekday)).toEqual([4, 5, 6, 0, 1, 2, 3])
    expect(grid.map((d) => d[0].weekStart)).toEqual(['2026-11-23', '2026-11-23', '2026-11-23', '2026-11-30', '2026-11-30', '2026-11-30', '2026-11-30'])
    expect(grid.map((d) => d[0].day)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('初日は今日で、2日目からは未来', () => {
    expect(grid[0].some((c) => c.time === 'now')).toBe(true)
    expect(grid.slice(1).flat().every((c) => c.time === 'future')).toBe(true)
  })

  it('年をまたいでも、暦の週と曜日がずれない', () => {
    const y = daysGrid('2026-12-30', new Date(Date.UTC(2026, 11, 30, 3)), TOKYO)
    expect(y.map((d) => d[0].date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'])
    expect(y[5][0]).toMatchObject({ weekday: 0, weekStart: '2027-01-04' })
    expect(y[4][0]).toMatchObject({ weekday: 6, weekStart: '2026-12-28' })
  })

  it('weekGrid は月曜から呼んだ daysGrid と同じ(省みる画面は変わらない)', () => {
    const at = new Date(Date.UTC(2026, 10, 25, 0))
    expect(weekGrid('2026-11-23', at, TOKYO)).toEqual(daysGrid('2026-11-23', at, TOKYO))
  })

  it('今日の日付は、設定のタイムゾーンで決まる', () => {
    const instant = new Date('2026-11-26T20:00:00Z')
    expect(todayOf(instant, 'Asia/Tokyo')).toBe('2026-11-27')
    expect(todayOf(instant, 'America/Los_Angeles')).toBe('2026-11-26')
  })
})

describe('weeksCovering(7日がかかる暦の週)', () => {
  it('月曜から始まる7日は、1つの週', () => {
    expect(weeksCovering('2026-11-30')).toEqual(['2026-11-30'])
  })

  it('月曜以外から始まる7日は、2つの週(日曜と月曜の境目)', () => {
    expect(weeksCovering('2026-11-27')).toEqual(['2026-11-23', '2026-11-30'])
    expect(weeksCovering('2026-12-06')).toEqual(['2026-11-30', '2026-12-07'])
  })

  it('年をまたいでも数えられる', () => {
    expect(weeksCovering('2026-12-30')).toEqual(['2026-12-28', '2027-01-04'])
  })

  it('曜日は 0 = 月曜 〜 6 = 日曜', () => {
    expect(weekdayOf('2026-11-30')).toBe(0)
    expect(weekdayOf('2026-12-06')).toBe(6)
  })
})
