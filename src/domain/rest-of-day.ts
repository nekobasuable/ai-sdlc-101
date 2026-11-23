import type { Block } from './blocks'

// 今日のこれから(スキル: 表ではなく文章で書く)。今のブロックより後のブロックを、予定のあるものと余白に分ける
export type RestOfDay = { planned: { label: string; bodies: string[] }[]; free: string[] }

export function restOfDay(blocks: readonly Block[], currentId: string | null, bodiesByBlock: ReadonlyMap<string, string[]>): RestOfDay {
  const start = currentId ? blocks.findIndex((b) => b.id === currentId) + 1 : 0
  const rest = blocks.slice(start)
  return {
    planned: rest.filter((b) => (bodiesByBlock.get(b.id) ?? []).length > 0).map((b) => ({ label: b.label, bodies: bodiesByBlock.get(b.id)! })),
    free: rest.filter((b) => (bodiesByBlock.get(b.id) ?? []).length === 0).map((b) => b.label),
  }
}

/** 余白のブロック名を文章にする: 「昼と夜」「昼、午後と夜」 */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join('、')}と${labels[labels.length - 1]}`
}
