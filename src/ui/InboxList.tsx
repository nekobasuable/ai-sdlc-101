import { useState } from 'react'
import type { Item } from '../data/items'
import { shortDate, sortForList } from '../domain/due'

// やること(Inbox、spec 変更 4 で名前を変更)。ふだんは閉じておく。リストが「こなすべき全て」に見えないように(P1、R13)
export default function InboxList({ items, canPlace, onPlace }: { items: Item[]; canPlace: boolean; onPlace: (item: Item) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <section>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-11 text-xs tracking-[0.18em] text-ink-3">
        やること　{items.length}
      </button>
      {open && (
        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
          {items.length === 0 && <li className="text-sm text-ink-3">いまは、何もない。</li>}
          {sortForList(items).map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 text-[15px] leading-relaxed text-ink-2">
              <span>
                {item.body}
                {item.dueDate && <span className="font-hand text-sm text-ink-3">　{shortDate(item.dueDate)}</span>}
              </span>
              {canPlace && (
                <button type="button" onClick={() => onPlace(item)} className="min-h-11 shrink-0 font-hand text-sm text-ink-3">
                  今やる
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
