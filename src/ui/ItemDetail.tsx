import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { saveNotes, type Item } from '../data/items'
import { consultText, consultUrl } from '../domain/consult'
import { shortDate } from '../domain/due'
import { pillarLabel } from '../domain/pillars'
import { QUADRANT_NAMES, type Quadrant } from '../domain/quadrant'
import { useItemActions } from './item-actions'
import ItemMeta from './ItemMeta'
import { usePillars } from './pillars-context'

/**
 * やることの詳細(spec R49、R50、plan/022 C)。押すと開き、その仕事を進める手がかりを置く。
 * メモ(Google ToDo の「詳細」と同期)、今やる・終えた・いつかに手放す、Claude に相談。
 * 仕分け(柱と局面)は一行で示し、「直す」を押したときだけ選ぶ欄を開く。
 * placed: 「今」のブロックに置いたもの(今やる・終えた・手放すは、その画面の操作を使う)
 */
export default function ItemDetail({ item, placed = false }: { item: Item; placed?: boolean }) {
  const pillars = usePillars()
  const actions = useItemActions()
  const [notes, setNotes] = useState(item.notes ?? '')
  const [fixing, setFixing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  // 開いたまま同期で中身が変わったら、新しい値にする。書いている最中は本人の入力を優先する(PR #22 のレビューの Nit、plan/023)
  useEffect(() => {
    if (document.activeElement !== notesRef.current) setNotes(item.notes ?? '')
  }, [item.notes])

  // メモの欄は、書いた分だけ縦に広がる。上限(画面の高さの半分)を超えたら、その中で送る(spec R49 補足、plan/023)
  useLayoutEffect(() => fitHeight(notesRef.current), [notes])
  useEffect(() => {
    const el = notesRef.current
    if (!el) return
    let open = true
    // 手書きの字(Web フォント)が後から届くと折り返しが変わるので、届いたらもう一度合わせる。閉じた後は何もしない(PR #23 のレビューの Nit)
    void document.fonts?.ready.then(() => open && fitHeight(el))
    // 画面の幅が変わる(スマホの回転、ウィンドウの幅)と折り返しも変わるので、幅が変わったら合わせ直す(PR #23 のレビューの Nit)。
    // 高さの変化では呼ばない(自分で高さを変えるたびに呼ばれ続けないように)
    let width = el.clientWidth
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fitHeight(el)
    })
    observer?.observe(el)
    return () => {
      open = false
      observer?.disconnect()
    }
  }, [])
  const pillar = pillarLabel(pillars, item.area)
  const quadrant = item.quadrant ? QUADRANT_NAMES[item.quadrant as Quadrant] : null
  const guessed = item.areaSource === 'ai' || item.quadrantSource === 'ai'
  const summary = [pillar, quadrant].filter(Boolean).join('・')

  async function keep(save: Promise<{ ok: boolean }>) {
    const res = await save
    setMessage(res.ok ? null : 'まだ残せていない。つながったら、もう一度書き直して欄を離れると残る。')
    if (res.ok) actions.refresh()
  }
  async function act(run: Promise<boolean>) {
    if (!(await run)) setMessage('いまは変えられなかった。少しおいて、もう一度。')
  }

  const consult = consultUrl(consultText({ body: item.body, dueDate: item.dueDate, notes, pillar }))
  const link = 'min-h-11 font-hand text-[15px] text-ink-3'

  return (
    <div className="mt-1 mb-3 ml-1 flex flex-col gap-3 border-l border-rule pl-4">
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 text-[13px] text-ink-3">
        {item.dueDate && <span>〆 {shortDate(item.dueDate)}</span>}
        <span className={guessed ? 'underline decoration-dotted underline-offset-4' : 'text-ink-2'}>
          {summary || 'まだ分けていない'}
          {guessed && '(見立て)'}
        </span>
        <button type="button" aria-expanded={fixing} onClick={() => setFixing(!fixing)} className="min-h-11 font-hand text-sm text-ink-3">
          {fixing ? '閉じる' : '直す'}
        </button>
      </p>
      {fixing && <ItemMeta item={item} onClassify={actions.classify} />}

      <div>
        <label htmlFor={`notes-${item.id}`} className="mb-1 block text-[13px] text-ink-3">
          メモ
        </label>
        <textarea
          ref={notesRef}
          id={`notes-${item.id}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.notes ?? '') && void keep(saveNotes(item.id, notes))}
          className="max-h-[50vh] w-full min-w-0 resize-none overflow-y-auto border-b border-rule bg-transparent py-1 font-hand text-base leading-relaxed text-ink outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-x-5">
        {!placed && actions.place && (
          <button type="button" onClick={() => void act(actions.place!(item))} className={link}>
            今やる
          </button>
        )}
        {!placed && (
          <button type="button" onClick={() => void act(actions.complete(item))} className={link}>
            終えた
          </button>
        )}
        {!placed && (
          <button type="button" onClick={() => void act(actions.letGo(item))} className={link}>
            いつかに手放す
          </button>
        )}
        {/* 相談の文を入れた claude.ai の新しいチャットを、新しいタブで開く。送るかは本人が決める(spec R50、C16) */}
        <a href={consult} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center font-hand text-[15px] text-ink underline decoration-rule underline-offset-[6px]">
          Claude に相談
        </a>
      </div>
      {message && <p className="m-0 text-[13px] text-ink-3">{message}</p>}
    </div>
  )
}

/** メモの欄の高さを中身に合わせる。上限は CSS の max-h(画面の高さの半分)で、超えたら中で送る */
function fitHeight(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  // 下線(border)の分も足す。足さないと、1px 足りずに中で送る印が出る
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
}
