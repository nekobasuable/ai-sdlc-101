import { describe, expect, it } from 'vitest'
import { collectByDate, monthGrid, monthRange, shiftMonth } from './month-grid'

describe('monthRange / shiftMonth', () => {
  it('初日と末日(うるう年の2月も)', () => {
    expect(monthRange(2026, 11)).toEqual({ first: '2026-11-01', last: '2026-11-30' })
    expect(monthRange(2028, 2)).toEqual({ first: '2028-02-01', last: '2028-02-29' })
  })

  it('年をまたいで前後の月へ', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('monthGrid', () => {
  // 2026年11月: 1日は日曜、30日は月曜
  const grid = monthGrid(2026, 11, '2026-11-26')

  it('月曜始まりで、前後の月の日も含めて週ごとに並べる', () => {
    expect(grid).toHaveLength(6)
    expect(grid.every((w) => w.length === 7)).toBe(true)
    expect(grid[0][0]).toMatchObject({ date: '2026-10-26', inMonth: false })
    expect(grid[0][6]).toMatchObject({ date: '2026-11-01', inMonth: true, day: 1 })
    expect(grid[5][0]).toMatchObject({ date: '2026-11-30', inMonth: true })
    expect(grid[5][6]).toMatchObject({ date: '2026-12-06', inMonth: false })
  })

  it('今日を境に、過去・今日・未来', () => {
    const all = grid.flat()
    expect(all.find((d) => d.date === '2026-11-25')?.time).toBe('past')
    expect(all.find((d) => d.date === '2026-11-26')?.time).toBe('today')
    expect(all.find((d) => d.date === '2026-11-27')?.time).toBe('future')
  })

  it('月曜から始まる月は、前の月の日を入れない', () => {
    // 2027年2月1日は月曜
    expect(monthGrid(2027, 2, '2027-02-10')[0][0]).toMatchObject({ date: '2027-02-01', inMonth: true })
  })
})

describe('collectByDate', () => {
  const start = '2026-10-26'
  const map = collectByDate(start, {
    events: [
      { day: 31, title: '講義', time: '18:00' },
      { day: 31, title: '朝会', time: '9:00' },
      { day: 31, title: '終日の旅', time: null },
    ],
    due: [{ body: '組織行動論レポート', dueDate: '2026-11-28' }, { body: '日付なし', dueDate: null }],
    placed: [
      { date: '2026-11-26', body: '統計のレポート', itemId: 'a', result: 'done' },
      { date: '2026-11-26', body: '英語', itemId: 'b', result: null },
    ],
    done: [
      { date: '2026-11-26', body: '統計のレポート', itemId: 'a' },
      { date: '2026-11-26', body: '牛乳を買う', itemId: 'c' },
    ],
  })

  it('予定は初日からの日数で日付に置き、時刻の順に並べる(終日は先)', () => {
    expect(map.get('2026-11-26')?.events.map((e) => e.title)).toEqual(['終日の旅', '朝会', '講義'])
  })

  it('締め切りは日付に置き、日付のないものは置かない', () => {
    expect(map.get('2026-11-28')?.due.map((d) => d.body)).toEqual(['組織行動論レポート'])
  })

  it('置いた予定で終えたものは、終えたことに重ねない', () => {
    expect(map.get('2026-11-26')?.placed).toEqual([{ body: '統計のレポート', done: true }, { body: '英語', done: false }])
    expect(map.get('2026-11-26')?.done).toEqual(['牛乳を買う'])
  })

  it('置いた日と終えた日がずれても、重ねない', () => {
    const m = collectByDate(start, {
      events: [],
      due: [],
      placed: [{ date: '2026-11-25', body: '統計のレポート', itemId: 'a', result: 'done' }],
      done: [{ date: '2026-11-26', body: '統計のレポート', itemId: 'a' }],
    })
    expect(m.get('2026-11-26')).toBeUndefined()
  })
})
