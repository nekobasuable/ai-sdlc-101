import { zonedMidnight, zonedParts } from './time'

/** 今週の範囲。月曜0時(含む)から翌週の月曜0時(含まない)まで、指定したタイムゾーンで数える */
export function weekRange(now: Date, timeZone: string): { start: Date; end: Date } {
  const p = zonedParts(now, timeZone)
  const daysSinceMonday = (p.weekday + 6) % 7
  // 暦の計算は UTC の Date で行う(日付の繰り上がりを任せるため)
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - daysSinceMonday))
  const nextMonday = new Date(Date.UTC(p.year, p.month - 1, p.day - daysSinceMonday + 7))
  return {
    start: zonedMidnight(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), timeZone),
    end: zonedMidnight(nextMonday.getUTCFullYear(), nextMonday.getUTCMonth() + 1, nextMonday.getUTCDate(), timeZone),
  }
}
