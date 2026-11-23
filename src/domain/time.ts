/** 指定したタイムゾーンでの、その瞬間の暦の日付と時刻 */
export type ZonedParts = {
  year: number
  /** 1〜12 */
  month: number
  day: number
  hour: number
  minute: number
  /** 0 = 日曜 〜 6 = 土曜 */
  weekday: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  }
}

/** 指定したタイムゾーンでの暦の日付の0時を、UTC の瞬間に直す(夏時間の切り替えにも対応) */
export function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const target = Date.UTC(year, month - 1, day)
  let guess = target
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone)
    const seenAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    guess += target - seenAsUtc
  }
  return new Date(guess)
}
