// ふくろうが跳ねるきっかけ(plan/013)。同じ配置が「終えた」に変わったときだけを数える。
// 開いたときの読み込み(前の結果がない)や、ブロックの切り替え(配置が入れ替わる)では数えない(PR #17 のレビューの指摘)
export type ResultEntry = { placementId: string; result: string | null }

/** 前に見えていた結果と比べて、まだ終えていなかった配置が「終えた」に変わったか */
export function newlyFinished(before: ReadonlyMap<string, string | null>, now: readonly ResultEntry[]): boolean {
  return now.some((e) => {
    const was = before.get(e.placementId)
    return was !== undefined && was !== 'done' && e.result === 'done'
  })
}

/** 次に比べるための、配置ごとの結果 */
export function resultsOf(entries: readonly ResultEntry[]): Map<string, string | null> {
  return new Map(entries.map((e) => [e.placementId, e.result]))
}
