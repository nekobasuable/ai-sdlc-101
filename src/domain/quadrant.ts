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
