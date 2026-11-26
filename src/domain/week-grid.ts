import { DEFAULT_BLOCKS, minuteOfDay, type Block } from './blocks'
import { addDays, weekStartOf } from './slot'
import { zonedParts } from './time'

/** ブロックが、今から見て過去・今・未来のどれか */
export type CellTime = 'past' | 'now' | 'future'
/**
 * day は格子の中での位置(初日から何日目か。0〜6)。weekGrid を月曜から呼べば曜日と同じになる。
 * weekStart と weekday は、その日が属する暦の週(月曜)と曜日(0 = 月曜)。置いたものの保存に使う(plan/019)
 */
export type Cell = { day: number; date: string; weekStart: string; weekday: number; block: Block; time: CellTime }

const pad = (n: number) => String(n).padStart(2, '0')

/** 暦の週(月曜から日曜)の格子。省みる画面が使う(R8、R13a) */
export function weekGrid(weekStart: string, now: Date, timeZone: string, blocks: readonly Block[] = DEFAULT_BLOCKS): Cell[][] {
  return daysGrid(weekStart, now, timeZone, blocks)
}

/** 日付(YYYY-MM-DD)の曜日。0 = 月曜 〜 6 = 日曜 */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** start の日から7日分の格子(7日 × ブロック)。日ごとの配列で返す。週の画面は今日から(spec R8 改、plan/019) */
export function daysGrid(start: string, now: Date, timeZone: string, blocks: readonly Block[] = DEFAULT_BLOCKS): Cell[][] {
  const p = zonedParts(now, timeZone)
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  const minute = minuteOfDay(now, timeZone)
  return Array.from({ length: 7 }, (_, day) => {
    const date = addDays(start, day)
    const weekday = weekdayOf(date)
    const weekStart = addDays(date, -weekday)
    return blocks.map((block) => {
      let time: CellTime
      if (date < today) time = 'past'
      else if (date > today) time = 'future'
      else if (minute >= block.endMinute) time = 'past'
      else if (minute >= block.startMinute) time = 'now'
      else time = 'future'
      return { day, date, weekStart, weekday, block, time }
    })
  })
}

/** ブロックを識別する文字列(日付と blockId の組。週をまたいでも重ならない) */
export const cellKey = (date: string, blockId: string) => `${date}/${blockId}`

/** 余白の割合: 何も置かれていないブロックの割合(R10、R11)。0〜1 */
export function slackRatio(grid: Cell[][], filled: ReadonlySet<string>): number {
  const cells = grid.flat()
  if (cells.length === 0) return 1
  const empty = cells.filter((c) => !filled.has(cellKey(c.date, c.block.id))).length
  return empty / cells.length
}

/** 今日(設定のタイムゾーン、YYYY-MM-DD) */
export function todayOf(now: Date, timeZone: string): string {
  return addDays(weekStartOf(now, timeZone), (zonedParts(now, timeZone).weekday + 6) % 7)
}

/** 余白が少なめだと、やわらかく知らせる目安(R11)。止めはしない */
export const LOW_SLACK = 0.4
