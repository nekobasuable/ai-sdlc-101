import { useState } from 'react'
import type { Item } from '../data/items'
import { shortDate, sortForList } from '../domain/due'
import { previewList } from '../domain/list-preview'
import { pillarLabel } from '../domain/pillars'
import { groupByQuadrant, QUADRANT_NAMES, type Quadrant } from '../domain/quadrant'
import ItemMeta, { type Classify } from './ItemMeta'
import ListMark from './ListMark'
import { usePillars } from './pillars-context'

// やること(Inbox、spec 変更 4 で名前を変更)。最初から開いて見せ、見出しを押すと閉じられる(spec R13 改、plan/015)。
// 閉じたかどうかはこの端末で覚える。一覧が「こなすべき全て」に見えないよう、多いときは最初の数件だけ見せる(P1)。
// 「一覧 / 四つに分ける」で、重要度と緊急度の4つの局面に分けても見られる(spec R5 改、plan/022 B)
const OPEN_KEY = 'inbox-open'
const VIEW_KEY = 'inbox-view'
type View = 'list' | 'quadrants'

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 保存領域が使えない環境では、覚えないだけ
  }
}

export default function InboxList({ items, canPlace, onPlace, onClassify }: { items: Item[]; canPlace: boolean; onPlace: (item: Item) => void; onClassify: Classify }) {
  const [open, setOpen] = useState(() => read(OPEN_KEY, 'true') !== 'false')
  const [view, setView] = useState<View>(() => (read(VIEW_KEY, 'list') === 'quadrants' ? 'quadrants' : 'list'))
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const sorted = sortForList(items)
  const { shown, hidden } = previewList(sorted, showAll)
  const toggle = () => {
    // 閉じたら、次に開いたときはまた最初の数件だけ見せる(PR #11 のレビューの Nit、P1)
    if (open) setShowAll(false)
    write(OPEN_KEY, String(!open))
    setOpen(!open)
  }
  const choose = (next: View) => {
    write(VIEW_KEY, next)
    setView(next)
  }
  const row = (item: Item) => (
    <Row key={item.id} item={item} editing={editing === item.id} onEdit={() => setEditing(editing === item.id ? null : item.id)} canPlace={canPlace} onPlace={onPlace} onClassify={onClassify} />
  )

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <button type="button" onClick={toggle} aria-expanded={open} className="min-h-11 label">
          やること　{items.length}
        </button>
        {open && items.length > 0 && (
          <span className="flex gap-3 font-hand text-sm">
            <button type="button" aria-pressed={view === 'list'} onClick={() => choose('list')} className={`min-h-11 ${view === 'list' ? 'text-ink' : 'text-ink-3'}`}>
              一覧
            </button>
            <button type="button" aria-pressed={view === 'quadrants'} onClick={() => choose('quadrants')} className={`min-h-11 ${view === 'quadrants' ? 'text-ink' : 'text-ink-3'}`}>
              四つに分ける
            </button>
          </span>
        )}
      </div>
      {open && items.length === 0 && <p className="m-0 mt-1 text-sm text-ink-3">いまは、何もない。</p>}
      {open && items.length > 0 && view === 'list' && (
        <ul className="m-0 mt-1 flex list-none flex-col p-0">
          {shown.map(row)}
          {hidden > 0 && (
            <li>
              <button type="button" onClick={() => setShowAll(true)} className="min-h-11 font-hand text-sm text-ink-3">
                ほかに {hidden} 件
              </button>
            </li>
          )}
        </ul>
      )}
      {open && items.length > 0 && view === 'quadrants' && <Quadrants items={sorted} row={row} />}
    </section>
  )
}

/** 四つに分けた表示。PC は2×2、スマホは縦に並べる。まだ分けていないものは下にまとめる。順位や評価の色は付けない */
function Quadrants({ items, row }: { items: Item[]; row: (item: Item) => React.ReactNode }) {
  const { byQuadrant, unsorted } = groupByQuadrant(items)
  const cell = (q: Quadrant) => (
    <div key={q} className="flex flex-col border-t border-rule-soft pt-2">
      <p className="m-0 text-[13px] text-ink-2">{QUADRANT_NAMES[q]}</p>
      {byQuadrant[q].length === 0 ? (
        <p className="m-0 py-2 font-mincho text-sm tracking-[0.1em] text-ink-3">なし</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">{byQuadrant[q].map(row)}</ul>
      )}
    </div>
  )
  return (
    <div className="mt-1 flex flex-col gap-5">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{([1, 2, 3, 4] as const).map(cell)}</div>
      {unsorted.length > 0 && (
        <div className="flex flex-col border-t border-rule-soft pt-2">
          <p className="m-0 text-[13px] text-ink-3">まだ分けていないこと</p>
          <ul className="m-0 flex list-none flex-col p-0">{unsorted.map(row)}</ul>
        </div>
      )}
    </div>
  )
}

/** やることの1行。押すと仕分けの欄が開く(局面もここで移せる) */
function Row({
  item,
  editing,
  onEdit,
  canPlace,
  onPlace,
  onClassify,
}: {
  item: Item
  editing: boolean
  onEdit: () => void
  canPlace: boolean
  onPlace: (item: Item) => void
  onClassify: Classify
}) {
  return (
    <li className="border-b border-rule-soft last:border-b-0">
      {/* 箇条書き: 頭に小さな墨の印、行のあいだに薄い罫線(spec R47、plan/020) */}
      <div className="flex items-start gap-3 text-base leading-relaxed text-ink">
        <ListMark />
        <button type="button" aria-expanded={editing} onClick={onEdit} className="min-h-11 flex-1 py-2 text-left">
          {item.body}
          {item.dueDate && <span className="font-hand text-sm whitespace-nowrap text-ink-3">　{shortDate(item.dueDate)}</span>}
          {item.area && <AreaMark item={item} />}
          {item.quadrantSource === 'ai' && <span className="sr-only">(局面は見立て)</span>}
        </button>
        {canPlace && (
          <button type="button" onClick={() => onPlace(item)} className="min-h-11 shrink-0 py-2 font-hand text-sm text-ink-3">
            今やる
          </button>
        )}
      </div>
      {editing && <ItemMeta item={item} onClassify={onClassify} />}
    </li>
  )
}

/** 人生の柱を小さく添える。AI の見立てなら点線で薄く(plan/017、plan/022) */
function AreaMark({ item }: { item: Item }) {
  const label = pillarLabel(usePillars(), item.area)
  if (!label) return null
  const style = item.areaSource === 'ai' ? 'text-ink-3 underline decoration-dotted underline-offset-4' : 'text-ink-2'
  return <span className={`ml-3 text-[13px] whitespace-nowrap ${style}`}>{label}</span>
}
