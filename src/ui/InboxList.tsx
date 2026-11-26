import { useState } from 'react'
import type { Item } from '../data/items'
import { shortDate, sortForList } from '../domain/due'
import { previewList } from '../domain/list-preview'
import { AREAS } from '../domain/areas'
import ItemMeta, { type Classify } from './ItemMeta'

// やること(Inbox、spec 変更 4 で名前を変更)。最初から開いて見せ、見出しを押すと閉じられる(spec R13 改、plan/015)。
// 閉じたかどうかはこの端末で覚える。一覧が「こなすべき全て」に見えないよう、多いときは最初の数件だけ見せる(P1)
const OPEN_KEY = 'inbox-open'

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) !== 'false'
  } catch {
    return true
  }
}

function writeOpen(open: boolean): void {
  try {
    localStorage.setItem(OPEN_KEY, String(open))
  } catch {
    // 保存領域が使えない環境では、覚えないだけ
  }
}

export default function InboxList({ items, canPlace, onPlace, onClassify }: { items: Item[]; canPlace: boolean; onPlace: (item: Item) => void; onClassify: Classify }) {
  const [open, setOpen] = useState(readOpen)
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const { shown, hidden } = previewList(sortForList(items), showAll)
  const toggle = () => {
    // 閉じたら、次に開いたときはまた最初の数件だけ見せる(PR #11 のレビューの Nit、P1)
    if (open) setShowAll(false)
    writeOpen(!open)
    setOpen(!open)
  }
  return (
    <section>
      <button type="button" onClick={toggle} aria-expanded={open} className="min-h-11 label">
        やること　{items.length}
      </button>
      {open && (
        <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
          {items.length === 0 && <li className="text-sm text-ink-3">いまは、何もない。</li>}
          {shown.map((item) => (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-4 text-base leading-relaxed text-ink">
                <button type="button" aria-expanded={editing === item.id} onClick={() => setEditing(editing === item.id ? null : item.id)} className="min-h-11 text-left">
                  {item.body}
                  {item.dueDate && <span className="font-hand text-sm text-ink-3">　{shortDate(item.dueDate)}</span>}
                  {item.area && <AreaMark item={item} />}
                </button>
                {canPlace && (
                  <button type="button" onClick={() => onPlace(item)} className="min-h-11 shrink-0 font-hand text-sm text-ink-3">
                    今やる
                  </button>
                )}
              </div>
              {editing === item.id && <ItemMeta item={item} onClassify={onClassify} />}
            </li>
          ))}
          {hidden > 0 && (
            <li>
              <button type="button" onClick={() => setShowAll(true)} className="min-h-11 font-hand text-sm text-ink-3">
                ほかに {hidden} 件
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/** 領域を小さく添える。AI の見立てなら点線で薄く(plan/017) */
function AreaMark({ item }: { item: Item }) {
  const label = AREAS.find((a) => a.id === item.area)?.label
  const style = item.areaSource === 'ai' ? 'text-ink-3 underline decoration-dotted underline-offset-4' : 'text-ink-2'
  return <span className={`ml-3 text-[13px] ${style}`}>{label}</span>
}
