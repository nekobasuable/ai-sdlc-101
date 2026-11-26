import { periodDay, periodOf } from './period'

// 今日のことを、一言だけ(spec R17a 補、plan/025)。「今」の画面に出すのは、夕方(17時)から次の朝(11時)まで。
// 夕方と夜(0〜5時を含む)はその日の一言、朝は前の日の一言(朝に書き足せるように)。昼は出さない(余白、P2)

export type DailyNoteSlot = { date: string; label: '今日' | '昨日' }

const toDate = (dayNumber: number) => new Date(dayNumber * 86_400_000).toISOString().slice(0, 10)

/** 出すなら、どの日の一言か。出さないなら null */
export function dailyNoteSlot(now: Date, timeZone: string): DailyNoteSlot | null {
  const period = periodOf(now, timeZone)
  if (period === 'noon') return null
  // periodDay は 0〜5時を前の日の夜として数える
  const day = periodDay(now, timeZone)
  if (period === 'morning') return { date: toDate(day - 1), label: '昨日' }
  return { date: toDate(day), label: '今日' }
}
