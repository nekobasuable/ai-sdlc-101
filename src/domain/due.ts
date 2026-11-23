// 締め切り(Google ToDo の日付)を生かす(spec R38、R39、R7)。日付は YYYY-MM-DD の文字列のまま比べる(タイムゾーンでずらさない)
export type DueItem = { id: string; body: string; dueDate: string | null; status: string }

const isOpen = (i: DueItem) => i.status === 'inbox' || i.status === 'candidate'
const byDue = (a: DueItem, b: DueItem) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')

/** 今日までのこと: 締め切りが今日のものと、過ぎていてまだ終えていないもの。どちらも締め切りの早い順 */
export function dueByToday<T extends DueItem>(items: readonly T[], today: string): { today: T[]; overdue: T[] } {
  const open = items.filter((i) => isOpen(i) && i.dueDate !== null).sort(byDue)
  return {
    today: open.filter((i) => i.dueDate === today),
    overdue: open.filter((i) => i.dueDate! < today),
  }
}

/** やることの並び: 締め切りの早い順、締め切りなしは後ろ(元の順を保つ) */
export function sortForList<T extends DueItem>(items: readonly T[]): T[] {
  const withDue = items.filter((i) => i.dueDate !== null).sort(byDue)
  return [...withDue, ...items.filter((i) => i.dueDate === null)]
}

/** 「11/28」の形 */
export const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
