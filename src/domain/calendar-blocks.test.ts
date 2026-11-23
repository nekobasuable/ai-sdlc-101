import { describe, expect, it } from 'vitest'
import { placeEvents } from './calendar-blocks'

const TOKYO = 'Asia/Tokyo'
const WEEK = '2026-11-23' // 月曜

describe('placeEvents', () => {
  it('時刻のある予定は、始まりの時刻のブロックに置く', () => {
    const [e] = placeEvents([{ id: 'a', title: '講義', start: '2026-11-24T18:00:00+09:00', end: '2026-11-24T21:10:00+09:00', allDay: false }], WEEK, TOKYO)
    expect(e).toEqual({ id: 'a', title: '講義', day: 1, blockId: 'evening', time: '18:00' })
  })

  it('UTC で書かれた予定も、設定のタイムゾーンで日とブロックを決める', () => {
    // 2026-11-24 23:30 UTC = 東京の 11/25(水) 8:30
    const [e] = placeEvents([{ id: 'b', title: '朝会', start: '2026-11-24T23:30:00Z', end: '2026-11-25T00:00:00Z', allDay: false }], WEEK, TOKYO)
    expect(e).toMatchObject({ day: 2, blockId: 'morning', time: '8:30' })
  })

  it('夜中の予定は、ブロックなしで置く', () => {
    const [e] = placeEvents([{ id: 'c', title: '夜行バス', start: '2026-11-26T02:00:00+09:00', end: '2026-11-26T06:00:00+09:00', allDay: false }], WEEK, TOKYO)
    expect(e).toMatchObject({ day: 3, blockId: null, time: '2:00' })
  })

  it('終日の予定は、終わりの日を含めずに日ごとに置き、週の外は除く', () => {
    const placed = placeEvents([{ id: 'd', title: '旅行', start: '2026-11-28', end: '2026-12-01', allDay: true }], WEEK, TOKYO)
    expect(placed.map((p) => p.day)).toEqual([5, 6])
    expect(placed.every((p) => p.blockId === null && p.time === null)).toBe(true)
  })

  it('週の外の予定は置かない', () => {
    expect(placeEvents([{ id: 'e', title: '来週', start: '2026-11-30T10:00:00+09:00', end: '2026-11-30T11:00:00+09:00', allDay: false }], WEEK, TOKYO)).toEqual([])
  })
})
