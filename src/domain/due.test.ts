import { describe, expect, it } from 'vitest'
import { dueByToday, shortDate, sortForList, type DueItem } from './due'

const item = (id: string, dueDate: string | null, status = 'inbox'): DueItem => ({ id, body: id, dueDate, status })

describe('dueByToday', () => {
  const items = [
    item('明日', '2026-11-25'),
    item('今日', '2026-11-24'),
    item('昨日', '2026-11-23'),
    item('先週', '2026-11-17', 'candidate'),
    item('終えた', '2026-11-24', 'done'),
    item('いつか', '2026-11-20', 'someday'),
    item('日付なし', null),
  ]

  it('今日が締め切りのものと、過ぎたものに分ける', () => {
    const { today, overdue } = dueByToday(items, '2026-11-24')
    expect(today.map((i) => i.id)).toEqual(['今日'])
    expect(overdue.map((i) => i.id)).toEqual(['先週', '昨日'])
  })

  it('終えたもの、いつか/やらない、日付のないものは出さない', () => {
    const { today, overdue } = dueByToday(items, '2026-11-24')
    const ids = [...today, ...overdue].map((i) => i.id)
    expect(ids).not.toContain('終えた')
    expect(ids).not.toContain('いつか')
    expect(ids).not.toContain('日付なし')
  })
})

describe('sortForList', () => {
  it('締め切りの早い順、締め切りなしは元の順のまま後ろ', () => {
    const sorted = sortForList([item('a', null), item('b', '2026-11-30'), item('c', null), item('d', '2026-11-25')])
    expect(sorted.map((i) => i.id)).toEqual(['d', 'b', 'a', 'c'])
  })
})

describe('shortDate', () => {
  it('月と日を先頭の0なしで', () => {
    expect(shortDate('2026-01-05')).toBe('1/5')
  })
})
