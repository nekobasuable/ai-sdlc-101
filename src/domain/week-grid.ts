import { DEFAULT_BLOCKS, minuteOfDay, type Block } from './blocks'
import { addDays } from './slot'
import { zonedParts } from './time'

/** ブロックが、今から見て過去・今・未来のどれか */
export type CellTime = 'past' | 'now' | 'future'
export type Cell = { day: number; date: string; block: Block; time: CellTime }

const pad = (n: number) => String(n).padStart(2, '0')

/** 週の格子(7日 × ブロック)。日ごとの配列で返す(R8、R13a) */
export function weekGrid(weekStart: string, now: Date, timeZone: string, blocks: readonly Block[] = DEFAULT_BLOCKS): Cell[][] {
  const p = zonedParts(now, timeZone)
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  const minute = minuteOfDay(now, timeZone)
  return Array.from({ length: 7 }, (_, day) => {
    const date = addDays(weekStart, day)
    return blocks.map((block) => {
      let time: CellTime
      if (date < today) time = 'past'
      else if (date > today) time = 'future'
      else if (minute >= block.endMinute) time = 'past'
      else if (minute >= block.startMinute) time = 'now'
      else time = 'future'
      return { day, date, block, time }
    })
  })
}

/** ブロックを識別する文字列(day と blockId の組) */
export const cellKey = (day: number, blockId: string) => `${day}/${blockId}`

/** 余白の割合: 何も置かれていないブロックの割合(R10、R11)。0〜1 */
export function slackRatio(grid: Cell[][], filled: ReadonlySet<string>): number {
  const cells = grid.flat()
  if (cells.length === 0) return 1
  const empty = cells.filter((c) => !filled.has(cellKey(c.day, c.block.id))).length
  return empty / cells.length
}

/** 余白が少なめだと、やわらかく知らせる目安(R11)。止めはしない */
export const LOW_SLACK = 0.4
