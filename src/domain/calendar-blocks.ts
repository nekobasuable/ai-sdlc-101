import { DEFAULT_BLOCKS, type Block } from './blocks'
import { addDays } from './slot'
import { zonedParts } from './time'

export type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean }
/** 週の中に置いた予定。blockId が null なのは、終日の予定か、どのブロックにも入らない時刻(夜中)の予定 */
export type PlacedEvent = { id: string; title: string; day: number; blockId: string | null; time: string | null }

const pad = (n: number) => String(n).padStart(2, '0')
const dayIndex = (weekStart: string, date: string) => {
  const [y1, m1, d1] = weekStart.split('-').map(Number)
  const [y2, m2, d2] = date.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** カレンダーの予定を、週の日とブロックに振り分ける(spec R9) */
export function placeEvents(events: readonly CalendarEvent[], weekStart: string, timeZone: string, blocks: readonly Block[] = DEFAULT_BLOCKS): PlacedEvent[] {
  const placed: PlacedEvent[] = []
  for (const e of events) {
    if (e.allDay) {
      // 終日の予定: 終わりの日付は含まない(Google カレンダーの決まり)。週の中の日ごとに置く
      for (let date = e.start.slice(0, 10); date < e.end.slice(0, 10); date = addDays(date, 1)) {
        const day = dayIndex(weekStart, date)
        if (day >= 0 && day < 7) placed.push({ id: e.id, title: e.title, day, blockId: null, time: null })
      }
      continue
    }
    const p = zonedParts(new Date(e.start), timeZone)
    const day = dayIndex(weekStart, `${p.year}-${pad(p.month)}-${pad(p.day)}`)
    if (day < 0 || day >= 7) continue
    const minute = p.hour * 60 + p.minute
    const block = blocks.find((b) => b.startMinute <= minute && minute < b.endMinute)
    placed.push({ id: e.id, title: e.title, day, blockId: block?.id ?? null, time: `${p.hour}:${pad(p.minute)}` })
  }
  return placed
}
