/** 1日を区切る2〜3時間のブロック(spec R8)。時刻は「その日の0時からの分」で表す。 */
export type Block = {
  id: string
  label: string
  /** 開始(含む)。0時からの分 */
  startMinute: number
  /** 終了(含まない)。0時からの分 */
  endMinute: number
}

const h = (hour: number) => hour * 60

/** 既定のブロック。0〜5時はどのブロックにも属さない。区切りは設定で差し替えられる(spec R8a) */
export const DEFAULT_BLOCKS: readonly Block[] = [
  { id: 'early', label: '早朝', startMinute: h(5), endMinute: h(8) },
  { id: 'morning', label: '午前', startMinute: h(8), endMinute: h(11) },
  { id: 'noon', label: '昼', startMinute: h(11), endMinute: h(14) },
  { id: 'afternoon', label: '午後', startMinute: h(14), endMinute: h(17) },
  { id: 'evening', label: '夕方', startMinute: h(17), endMinute: h(20) },
  { id: 'night', label: '夜', startMinute: h(20), endMinute: h(24) },
]

/** 指定したタイムゾーンでの、その日の0時からの分を返す */
export function minuteOfDay(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return get('hour') * 60 + get('minute')
}

/** 今のブロックを返す。どのブロックにも属さない時間帯は null */
export function currentBlock(
  now: Date,
  timeZone: string,
  blocks: readonly Block[] = DEFAULT_BLOCKS,
): Block | null {
  const minute = minuteOfDay(now, timeZone)
  return blocks.find((b) => b.startMinute <= minute && minute < b.endMinute) ?? null
}
