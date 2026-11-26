import { describe, expect, it } from 'vitest'
import { contrastRatio, PALETTE } from './contrast'
import { PAPER, periodDay, periodOf } from './period'

const TZ = 'Asia/Tokyo'
// 東京の暦の日時を UTC の瞬間にする(東京は +9 時間、夏時間なし)
const tokyo = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`)

describe('periodOf', () => {
  it.each([
    ['04:59', 'night'],
    ['05:00', 'morning'],
    ['10:59', 'morning'],
    ['11:00', 'noon'],
    ['16:59', 'noon'],
    ['17:00', 'evening'],
    ['19:59', 'evening'],
    ['20:00', 'night'],
    ['00:30', 'night'],
  ])('%s は %s', (time, period) => {
    expect(periodOf(tokyo('2026-11-26', time), TZ)).toBe(period)
  })

  it('設定のタイムゾーンで判定する', () => {
    const instant = new Date('2026-11-26T03:00:00Z')
    expect(periodOf(instant, 'Asia/Tokyo')).toBe('noon')
    expect(periodOf(instant, 'America/Los_Angeles')).toBe('evening')
  })
})

describe('periodDay', () => {
  it('0〜5時は前の日の夜として数える', () => {
    const night = periodDay(tokyo('2026-11-26', '22:00'), TZ)
    expect(periodDay(tokyo('2026-11-27', '00:30'), TZ)).toBe(night)
    expect(periodDay(tokyo('2026-11-27', '04:59'), TZ)).toBe(night)
    expect(periodDay(tokyo('2026-11-27', '05:00'), TZ)).toBe(night + 1)
  })

  it('同じ日の時間帯は同じ日の番号', () => {
    expect(periodDay(tokyo('2026-11-26', '05:00'), TZ)).toBe(periodDay(tokyo('2026-11-26', '23:59'), TZ))
  })
})

describe('PAPER(時間帯ごとの紙の色、R44)', () => {
  it.each(Object.entries(PAPER))('%s の紙の上で、ink-3 の文字が 4.5:1 以上', (_, paper) => {
    expect(contrastRatio(PALETTE.ink3, paper)).toBeGreaterThanOrEqual(4.5)
  })
})
