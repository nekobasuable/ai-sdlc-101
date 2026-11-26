import { describe, expect, it } from 'vitest'
import { captureFields, toDueDate } from './capture'

describe('captureFields', () => {
  it('題名だけなら、締め切りとメモは null', () => {
    expect(captureFields({ body: ' 牛乳を買う ', dueDate: '', notes: '  ' })).toEqual({ body: '牛乳を買う', dueDate: null, notes: null })
  })

  it('締め切りとメモを付ける', () => {
    expect(captureFields({ body: 'レポート', dueDate: '2026-11-28', notes: ' 第3章まで\n図も ' })).toEqual({ body: 'レポート', dueDate: '2026-11-28', notes: '第3章まで\n図も' })
  })

  it('題名が空なら追加しない', () => {
    expect(captureFields({ body: '  ', dueDate: '2026-11-28', notes: 'メモ' })).toBeNull()
  })
})

describe('toDueDate', () => {
  it.each([
    ['2026-11-28', '2026-11-28'],
    ['', null],
    ['11/28', null],
    ['2026-02-30', null],
    ['2028-02-29', '2028-02-29'],
    // 年を打つ途中の値や、範囲の外は付けない
    ['0002-11-28', null],
    ['0202-11-28', null],
    ['1999-12-31', null],
    ['2000-01-01', '2000-01-01'],
    ['2100-12-31', '2100-12-31'],
    ['2101-01-01', null],
  ])('%s → %s', (value, expected) => {
    expect(toDueDate(value)).toBe(expected)
  })
})
