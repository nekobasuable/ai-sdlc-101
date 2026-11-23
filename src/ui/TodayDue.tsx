import type { Item } from '../data/items'
import { shortDate } from '../domain/due'
import HandCircle from './HandCircle'

// 今日までのこと(spec R38)。締め切りが今日のものと、過ぎていてまだ終えていないもの。
// 過ぎたものには日付を添えるだけで、警告の色や口調にはしない(R16、R23)。今やることより小さく、下に置く(P7)
export default function TodayDue({ today, overdue, onComplete }: { today: Item[]; overdue: Item[]; onComplete: (item: Item) => void }) {
  if (today.length === 0 && overdue.length === 0) return null
  return (
    <section>
      <h2 className="m-0 mb-2 text-xs font-normal tracking-[0.18em] text-ink-3">今日までのこと</h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {[...overdue, ...today].map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <HandCircle checked={false} label={`${item.body}を終えた`} onClick={() => onComplete(item)} />
            <span className="text-[15px] leading-relaxed text-ink-2">
              {item.body}
              {item.dueDate && overdue.includes(item) && (
                <span className="font-hand text-sm text-ink-3">　{shortDate(item.dueDate)} まで</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
