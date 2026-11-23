import { describe, expect, it } from 'vitest'
import { weekRange } from './week'

const TOKYO = 'Asia/Tokyo'
// 2026-11-23 は月曜。東京の暦の日時を UTC の Date にする
const tokyo = (day: number, hh = 12) => new Date(Date.UTC(2026, 10, day, hh - 9))
const iso = (d: Date) => d.toISOString()

describe('weekRange', () => {
  it('週の途中(水曜)は、その週の月曜0時から翌週の月曜0時まで', () => {
    const { start, end } = weekRange(tokyo(25), TOKYO)
    expect(iso(start)).toBe('2026-11-22T15:00:00.000Z') // 東京の 11/23 0:00
    expect(iso(end)).toBe('2026-11-29T15:00:00.000Z') // 東京の 11/30 0:00
  })

  it('月曜0時ちょうどは、その週の始まり', () => {
    const { start } = weekRange(tokyo(23, 0), TOKYO)
    expect(iso(start)).toBe('2026-11-22T15:00:00.000Z')
  })

  it('日曜の夜は、まだ前の月曜から始まる週', () => {
    const { start } = weekRange(tokyo(29, 23), TOKYO)
    expect(iso(start)).toBe('2026-11-22T15:00:00.000Z')
  })

  it('夏時間のあるタイムゾーンでも、週の始まりは現地の0時', () => {
    // ニューヨークは 2026-11-01(日)に夏時間が終わる。11/4(水)の週は 11/2(月)0:00 EST = 05:00 UTC から
    const { start } = weekRange(new Date(Date.UTC(2026, 10, 4, 17)), 'America/New_York')
    expect(iso(start)).toBe('2026-11-02T05:00:00.000Z')
  })
})
