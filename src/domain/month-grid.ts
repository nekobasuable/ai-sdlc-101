import { addDays } from './slot'
import { weekdayOf } from './week-grid'

// 月のカレンダー(spec R48、plan/021)。月曜始まりの週の行に、前後の月の日も含めて並べる
export type MonthDay = { date: string; day: number; inMonth: boolean; time: 'past' | 'today' | 'future' }

const pad = (n: number) => String(n).padStart(2, '0')

/** その月の初日と末日(YYYY-MM-DD)。month は 1〜12 */
export function monthRange(year: number, month: number): { first: string; last: string } {
  const first = `${year}-${pad(month)}-01`
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  return { first, last }
}

/** 前後の月へ。delta は -1(前の月)や 1(次の月) */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

/** 月の格子。週ごとの行(4〜6行)。today と比べて、過去・今日・未来を付ける */
export function monthGrid(year: number, month: number, today: string): MonthDay[][] {
  const { first, last } = monthRange(year, month)
  const start = addDays(first, -weekdayOf(first))
  const end = addDays(last, 6 - weekdayOf(last))
  const rows: MonthDay[][] = []
  for (let monday = start; monday <= end; monday = addDays(monday, 7)) {
    rows.push(
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i)
        return {
          date,
          day: Number(date.slice(8)),
          inMonth: date >= first && date <= last,
          time: date < today ? 'past' : date === today ? 'today' : 'future',
        }
      }),
    )
  }
  return rows
}

/** 月のカレンダーの、1日分の中身(spec R48) */
export type DayContent = {
  events: { title: string; time: string | null }[]
  due: string[]
  placed: { body: string; done: boolean }[]
  done: string[]
}

const empty = (): DayContent => ({ events: [], due: [], placed: [], done: [] })

/**
 * 予定、締め切り、置いた予定、終えたことを、日付ごとにまとめる。
 * 予定の day は格子の初日(start)から何日目か。置いた予定で終えたものは、終えたことに重ねて数えない
 */
export function collectByDate(
  start: string,
  input: {
    events: readonly { day: number; title: string; time: string | null }[]
    due: readonly { body: string; dueDate: string | null }[]
    placed: readonly { date: string; body: string; itemId: string; result: string | null }[]
    done: readonly { date: string; body: string; itemId: string }[]
  },
): Map<string, DayContent> {
  const map = new Map<string, DayContent>()
  const at = (date: string) => map.get(date) ?? map.set(date, empty()).get(date)!
  for (const e of input.events) at(addDays(start, e.day)).events.push({ title: e.title, time: e.time })
  for (const d of input.due) if (d.dueDate) at(d.dueDate).due.push(d.body)
  const placedDone = new Set(input.placed.filter((p) => p.result === 'done').map((p) => `${p.date}/${p.itemId}`))
  for (const p of input.placed) at(p.date).placed.push({ body: p.body, done: p.result === 'done' })
  for (const d of input.done) if (!placedDone.has(`${d.date}/${d.itemId}`)) at(d.date).done.push(d.body)
  for (const c of map.values()) c.events.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '', undefined, { numeric: true }))
  return map
}
