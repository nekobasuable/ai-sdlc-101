// やることの一覧は、最初の数件だけ見せる(spec R13 改、P1)。一覧が「こなすべき全て」に見えないように
export const PREVIEW_COUNT = 7

/**
 * @param showAll 「ほかに N 件」を押して、すべてを出しているか
 * @returns 見せる項目と、隠している件数
 */
export function previewList<T>(items: readonly T[], showAll: boolean, count = PREVIEW_COUNT): { shown: readonly T[]; hidden: number } {
  if (showAll || items.length <= count) return { shown: items, hidden: 0 }
  return { shown: items.slice(0, count), hidden: items.length - count }
}
