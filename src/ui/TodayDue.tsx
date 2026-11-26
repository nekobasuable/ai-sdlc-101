import type { Item } from '../data/items'
import { shortDate } from '../domain/due'
import { useState } from 'react'
import HandCircle from './HandCircle'
import ItemDetail from './ItemDetail'

// 今日までのこと(spec R38)。締め切りが今日のものと、過ぎていてまだ終えていないもの。
// 過ぎたものには日付を添えるだけで、警告の色や口調にはしない(R16、R23)。今やることより小さく、下に置く(P7)
export default function TodayDue({
  today,
  overdue,
  onComplete,
}: {
  today: Item[]
  overdue: Item[]
  onComplete: (item: Item) => void | Promise<boolean>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  if (today.length === 0 && overdue.length === 0) return null
  return (
    <section>
      <h2 className="m-0 mb-2 label font-normal">今日までのこと</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {[...overdue, ...today].map((item) => (
          <li key={item.id} className="border-b border-rule-soft last:border-b-0">
            <div className="flex items-center gap-2">
              <HandCircle checked={false} label={`${item.body}を終えた`} onClick={() => onComplete(item)} />
              <button
                type="button"
                aria-expanded={editing === item.id}
                onClick={() => setEditing(editing === item.id ? null : item.id)}
                className="min-h-11 text-left text-base leading-relaxed text-ink"
              >
                {item.body}
                {item.dueDate && overdue.includes(item) && <span className="font-hand text-sm text-ink-3">　{shortDate(item.dueDate)} まで</span>}
              </button>
            </div>
            {editing === item.id && <div className="ml-12"><ItemDetail item={item} /></div>}
          </li>
        ))}
      </ul>
    </section>
  )
}
