import type { Item } from '../data/items'
import { AREAS, type Area } from '../domain/areas'
import { fromQuadrant, toQuadrant, type Quadrant } from '../domain/quadrant'

export type Classify = (item: Item, meta: { area: Area | null; quadrant: Quadrant | null }) => void

// 仕分けの小さな欄(plan/007 段階 C、R4)。領域と、2つの問い(大切なこと / 急ぐこと)。どれも任意(P5)
export default function ItemMeta({ item, onClassify }: { item: Item; onClassify: Classify }) {
  const answers = fromQuadrant(item.quadrant)
  const toggle = (key: 'important' | 'urgent') => {
    const next = { important: answers?.important ?? false, urgent: answers?.urgent ?? false, [key]: !(answers?.[key] ?? false) }
    // どちらも外したら、未設定に戻す(問いに答えていない状態)
    onClassify(item, { area: item.area, quadrant: next.important || next.urgent ? toQuadrant(next) : null })
  }
  const on = 'text-ink underline decoration-rule underline-offset-[6px]'
  return (
    <div className="mt-1 mb-2 flex flex-col gap-1 border-l border-rule pl-4 font-hand text-[15px]">
      <div className="flex flex-wrap gap-x-4">
        {AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={item.area === a.id}
            onClick={() => onClassify(item, { area: item.area === a.id ? null : a.id, quadrant: item.quadrant })}
            className={`min-h-11 ${item.area === a.id ? on : 'text-ink-3'}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4">
        <button type="button" aria-pressed={answers?.important ?? false} onClick={() => toggle('important')} className={`min-h-11 ${answers?.important ? on : 'text-ink-3'}`}>
          大切なこと
        </button>
        <button type="button" aria-pressed={answers?.urgent ?? false} onClick={() => toggle('urgent')} className={`min-h-11 ${answers?.urgent ? on : 'text-ink-3'}`}>
          急ぐこと
        </button>
      </div>
    </div>
  )
}
