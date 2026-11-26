import { describe, expect, it } from 'vitest'
import { dailyNoteSlot } from './daily-note'

const TZ = 'Asia/Tokyo'
const tokyo = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`)

describe('dailyNoteSlot', () => {
  it.each([
    ['2026-11-26', '11:00', null],
    ['2026-11-26', '16:59', null],
    ['2026-11-26', '17:00', { date: '2026-11-26', label: '今日' }],
    ['2026-11-26', '23:30', { date: '2026-11-26', label: '今日' }],
    // 0〜5時は前の日の夜
    ['2026-11-27', '01:00', { date: '2026-11-26', label: '今日' }],
    // 朝は前の日の一言
    ['2026-11-27', '05:00', { date: '2026-11-26', label: '昨日' }],
    ['2026-11-27', '10:59', { date: '2026-11-26', label: '昨日' }],
    // 月をまたぐ
    ['2026-12-01', '07:00', { date: '2026-11-30', label: '昨日' }],
  ])('%s %s', (date, time, expected) => {
    expect(dailyNoteSlot(tokyo(date, time), TZ)).toEqual(expected)
  })
})
