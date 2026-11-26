import { zonedParts } from './time'

// 1日の4つの時間帯(spec R44)。言葉の巡り(R18)と、空の絵と紙の色合い(plan/013)が使う
export type Period = 'morning' | 'noon' | 'evening' | 'night'

/** 朝 5〜11時、昼 11〜17時、夕方 17〜20時、夜 20〜5時 */
export function periodOf(now: Date, timeZone: string): Period {
  const { hour } = zonedParts(now, timeZone)
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'noon'
  if (hour >= 17 && hour < 20) return 'evening'
  return 'night'
}

/**
 * 時間帯が属する日の番号(1970-01-01 を 0 とする、設定のタイムゾーンでの暦の日)。
 * 0〜5時は前の日の夜として数える
 */
export function periodDay(now: Date, timeZone: string): number {
  const { year, month, day, hour } = zonedParts(now, timeZone)
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
  return hour < 5 ? dayNumber - 1 : dayNumber
}
