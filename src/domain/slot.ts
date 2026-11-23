import { currentBlock, DEFAULT_BLOCKS, type Block } from './blocks'
import { zonedParts } from './time'

/**
 * 週の計画の中での位置。day は 0 = 月曜 〜 6 = 日曜(JavaScript の 0 = 日曜とは違う)。
 * データベースの placements.day もこの数え方で保存する。
 */
export type Slot = { weekStart: string; day: number; blockId: string }

/** 今の時刻が属する位置を返す。どのブロックにも属さない時間帯は null */
export function currentSlot(now: Date, timeZone: string, blocks: readonly Block[] = DEFAULT_BLOCKS): Slot | null {
  const block = currentBlock(now, timeZone, blocks)
  if (!block) return null
  const p = zonedParts(now, timeZone)
  const day = (p.weekday + 6) % 7
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - day))
  return { weekStart: monday.toISOString().slice(0, 10), day, blockId: block.id }
}

/** 今週の開始日(月曜、YYYY-MM-DD)。ブロックの外の時間帯でも求められる */
export function weekStartOf(now: Date, timeZone: string): string {
  const p = zonedParts(now, timeZone)
  const day = (p.weekday + 6) % 7
  return new Date(Date.UTC(p.year, p.month - 1, p.day - day)).toISOString().slice(0, 10)
}

/** YYYY-MM-DD に日数を足す */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
