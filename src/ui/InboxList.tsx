import { useState } from 'react'
import type { Item } from '../data/items'

// Inbox は折りたたんでおく。リストが「こなすべき全て」に見えないように(P1、R13)
export default function InboxList({ items, canPlace, onPlace }: { items: Item[]; canPlace: boolean; onPlace: (item: Item) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <section>
      <button className="text-sm text-stone-500" onClick={() => setOpen(!open)}>
        Inbox({items.length}){open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {items.length === 0 && <li className="text-sm text-stone-400">空っぽです</li>}
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="text-stone-700">{item.body}</span>
              {canPlace && (
                <button className="shrink-0 rounded border border-stone-300 px-3 py-1 text-sm" onClick={() => onPlace(item)}>
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
