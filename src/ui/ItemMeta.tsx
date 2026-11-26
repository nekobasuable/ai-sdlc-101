import type { ClassifyChange, Item } from '../data/items'
import { AREAS } from '../domain/areas'
import { fromQuadrant, toQuadrant } from '../domain/quadrant'

export type Classify = (item: Item, change: ClassifyChange) => void

// 仕分けの小さな欄(plan/007 段階 C、R4)。領域と、2つの問い(大切なこと / 急ぐこと)。どれも任意(P5)
// AI の見立て(plan/017、R25 改)は、点線の下線で薄く示し、「見立て」と理由を小さく添える。押すと本人の判断になる
export default function ItemMeta({ item, onClassify }: { item: Item; onClassify: Classify }) {
  const answers = fromQuadrant(item.quadrant)
  const toggle = (key: 'important' | 'urgent') => {
    const next = { important: answers?.important ?? false, urgent: answers?.urgent ?? false, [key]: !(answers?.[key] ?? false) }
    // どちらも外したら、未設定に戻す(問いに答えていない状態)
    onClassify(item, { quadrant: next.important || next.urgent ? toQuadrant(next) : null })
  }
  const mine = 'text-ink underline decoration-rule underline-offset-[6px]'
  const guess = 'text-ink-2 underline decoration-dotted decoration-ink-3 underline-offset-[6px]'
  const chosen = (source: Item['areaSource']) => (source === 'ai' ? guess : mine)
  const hasGuess = item.areaSource === 'ai' || item.quadrantSource === 'ai'
  return (
    <div className="mt-1 mb-2 flex flex-col gap-1 border-l border-rule pl-4 font-hand text-[15px]">
      <div className="flex flex-wrap gap-x-4">
        {AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={item.area === a.id}
            onClick={() => onClassify(item, { area: item.area === a.id && item.areaSource === 'user' ? null : a.id })}
            className={`min-h-11 ${item.area === a.id ? chosen(item.areaSource) : 'text-ink-3'}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4">
        <button type="button" aria-pressed={answers?.important ?? false} onClick={() => toggle('important')} className={`min-h-11 ${answers?.important ? chosen(item.quadrantSource) : 'text-ink-3'}`}>
          大切なこと
        </button>
        <button type="button" aria-pressed={answers?.urgent ?? false} onClick={() => toggle('urgent')} className={`min-h-11 ${answers?.urgent ? chosen(item.quadrantSource) : 'text-ink-3'}`}>
          急ぐこと
        </button>
      </div>
      {hasGuess && (
        <p className="m-0 pb-1 font-sans text-[13px] text-ink-3">
          点線は見立て{item.aiReason ? `(${item.aiReason})` : ''}。違えば押して直す。
        </p>
      )}
    </div>
  )
}
