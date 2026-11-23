import { describe, expect, it } from 'vitest'
import { currentSlot } from './slot'

const TOKYO = 'Asia/Tokyo'
// 2026-11-23 は月曜。東京の暦の日時を UTC の Date にする
const tokyo = (day: number, hh: number) => new Date(Date.UTC(2026, 10, day, hh - 9))

describe('currentSlot', () => {
  it('平日の午前は、その週の月曜を週の開始日とし、曜日を月曜 = 0 で数える', () => {
    expect(currentSlot(tokyo(25, 9), TOKYO)).toEqual({ weekStart: '2026-11-23', day: 2, blockId: 'morning' })
  })

  it('日曜の夜は、曜日が 6 で、週の開始日は前の月曜', () => {
    expect(currentSlot(tokyo(29, 21), TOKYO)).toEqual({ weekStart: '2026-11-23', day: 6, blockId: 'night' })
  })

  it('夜中(ブロックの外)は null', () => {
    expect(currentSlot(tokyo(24, 3), TOKYO)).toBeNull()
  })
})
