import { describe, expect, it } from 'vitest'
import { currentBlock, type Block } from './blocks'

const TOKYO = 'Asia/Tokyo'
// 東京は UTC+9(夏時間なし)。東京の時刻 hh:mm を UTC の Date にする
const tokyo = (hh: number, mm = 0) => new Date(Date.UTC(2026, 10, 23, hh - 9, mm))

describe('currentBlock', () => {
  it('ブロックの開始時刻はそのブロックに含まれる', () => {
    expect(currentBlock(tokyo(8, 0), TOKYO)?.label).toBe('午前')
  })

  it('ブロックの終了時刻の直前は、まだそのブロック', () => {
    expect(currentBlock(tokyo(7, 59), TOKYO)?.label).toBe('早朝')
    expect(currentBlock(tokyo(23, 59), TOKYO)?.label).toBe('夜')
  })

  it('夜中(0〜5時)はどのブロックにも属さない', () => {
    expect(currentBlock(tokyo(3, 0), TOKYO)).toBeNull()
  })

  it('同じ瞬間でも、タイムゾーンが違えば別のブロックになる', () => {
    const instant = tokyo(9, 0) // UTC 0:00
    expect(currentBlock(instant, TOKYO)?.label).toBe('午前')
    expect(currentBlock(instant, 'UTC')).toBeNull()
  })

  it('区切りを差し替えられる', () => {
    const custom: Block[] = [{ id: 'class', label: '授業', startMinute: 9 * 60, endMinute: 12 * 60 + 30 }]
    expect(currentBlock(tokyo(12, 15), TOKYO, custom)?.label).toBe('授業')
    expect(currentBlock(tokyo(12, 30), TOKYO, custom)).toBeNull()
  })
})
