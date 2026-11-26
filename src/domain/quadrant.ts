// 象限を、番号や表ではなく2つの問い(大切なこと / 急ぐこと)で扱う(plan/007 段階 C、spec R4、R12)
// 1 = 大切で急ぐ、2 = 大切で急がない、3 = 大切ではないが急ぐ、4 = どちらでもない
export type Quadrant = 1 | 2 | 3 | 4
export type Answers = { important: boolean; urgent: boolean }

export function toQuadrant({ important, urgent }: Answers): Quadrant {
  if (important) return urgent ? 1 : 2
  return urgent ? 3 : 4
}

/** 象限が未設定なら、どちらの問いにも答えていない状態 */
export function fromQuadrant(q: number | null): Answers | null {
  if (q === null) return null
  return { important: q === 1 || q === 2, urgent: q === 1 || q === 3 }
}

/** 大切で急がないこと(第2象限)を先に。ほかは元の順のまま(R12、P4) */
export function secondQuadrantFirst<T extends { quadrant: number | null }>(items: readonly T[]): T[] {
  return [...items.filter((i) => i.quadrant === 2), ...items.filter((i) => i.quadrant !== 2)]
}

/** 四つに分けたときの局面の名前(spec R5 改、plan/022 B)。順位や評価の色は付けない */
export const QUADRANT_NAMES: Record<Quadrant, string> = {
  1: '大切で急ぐ',
  2: '大切で急がない',
  3: '急ぐだけ',
  4: 'どちらでもない',
}

/** 項目を4つの局面と「まだ分けていない」に分ける。それぞれの中の順は保つ */
export function groupByQuadrant<T extends { quadrant: number | null }>(items: readonly T[]): { byQuadrant: Record<Quadrant, T[]>; unsorted: T[] } {
  const byQuadrant: Record<Quadrant, T[]> = { 1: [], 2: [], 3: [], 4: [] }
  const unsorted: T[] = []
  for (const it of items) {
    if (it.quadrant === 1 || it.quadrant === 2 || it.quadrant === 3 || it.quadrant === 4) byQuadrant[it.quadrant].push(it)
    else unsorted.push(it)
  }
  return { byQuadrant, unsorted }
}
