import type { Block } from './blocks'
import { pillarLabel, type Pillar } from './pillars'
import type { Cell } from './week-grid'

// 省みる(plan/007 段階 D、spec R15〜R17)。時間は「およそ」で、文章にして見せる(C2、R16)
export type ReviewEntry = { blockId: string; day: number; result: string | null; item: { id: string; status: string; area: string | null; quadrant: number | null } }
/** count: その週に、何度時間を向けたか(柱ごとの振り返りに使う。spec R15 補、plan/022) */
export type TimeRow = { label: string; minutes: number; count: number }

const QUADRANT_LABELS: Record<number, string> = {
  1: '大切で急ぐこと',
  2: '大切で、急がないこと',
  3: '急ぐが、大切ではないこと',
  4: '大切でも急ぎでもないこと',
}

/** そのブロックで使った時間(分)。終えたら長さのまま、途中までは半分(R15)。手放した・結果なしは 0 */
function minutesOf(entry: ReviewEntry, blocks: readonly Block[]): number {
  const block = blocks.find((b) => b.id === entry.blockId)
  if (!block) return 0
  const length = block.endMinute - block.startMinute
  if (entry.result === 'done') return length
  if (entry.result === 'partial') return length / 2
  return 0
}

/** 象限別と、人生の柱別の時間と回数。多い順に並べ、0分のものは出さない */
export function timeSpent(
  entries: readonly ReviewEntry[],
  blocks: readonly Block[],
  pillars: readonly Pillar[],
): { byQuadrant: TimeRow[]; byArea: TimeRow[] } {
  const quadrant = new Map<string, { minutes: number; count: number }>()
  const area = new Map<string, { minutes: number; count: number }>()
  const add = (map: typeof area, key: string, m: number) => {
    const cur = map.get(key) ?? { minutes: 0, count: 0 }
    map.set(key, { minutes: cur.minutes + m, count: cur.count + 1 })
  }
  for (const e of entries) {
    const m = minutesOf(e, blocks)
    if (m === 0) continue
    add(quadrant, e.item.quadrant ? QUADRANT_LABELS[e.item.quadrant] : '仕分けていないこと', m)
    add(area, pillarLabel(pillars, e.item.area) ?? '柱を決めていないこと', m)
  }
  const rows = (map: typeof area) => [...map].map(([label, v]) => ({ label, ...v })).sort((x, y) => y.minutes - x.minutes)
  return { byQuadrant: rows(quadrant), byArea: rows(area) }
}

/** 「およそ N 時間」。30分未満は「少し」 */
export function aboutHours(minutes: number): string {
  if (minutes < 30) return '少し'
  return `およそ${Math.max(1, Math.round(minutes / 60))}時間`
}

/**
 * 手放したこと(R17): 「今日は手放した」か、結果のないまま過ぎたもの。
 * まだ選び直していない項目(状態が「候補」のまま)だけを出す。やることに戻したもの、いつかにしたもの、完了したものは出さない
 * (PR #7 のレビューの指摘: 選び直しても一覧に残り続けていた)。重複は除く
 */
export function letGo<T extends ReviewEntry>(entries: readonly T[], grid: Cell[][]): T[] {
  const past = new Set(grid.flat().filter((c) => c.time === 'past').map((c) => `${c.day}/${c.block.id}`))
  const seen = new Set<string>()
  return entries.filter((e) => {
    if (e.item.status !== 'candidate' || seen.has(e.item.id)) return false
    const dropped = e.result === 'not_done' || (e.result === null && past.has(`${e.day}/${e.blockId}`))
    if (dropped) seen.add(e.item.id)
    return dropped
  })
}

