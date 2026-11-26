import { useState } from 'react'
import { saveFirstStep, saveNotes, type Item } from '../data/items'
import { consultText, consultUrl } from '../domain/consult'
import { shortDate } from '../domain/due'
import { pillarLabel } from '../domain/pillars'
import { QUADRANT_NAMES, type Quadrant } from '../domain/quadrant'
import { useItemActions } from './item-actions'
import ItemMeta from './ItemMeta'
import { usePillars } from './pillars-context'

/**
 * やることの詳細(spec R49、R50、plan/022 C)。押すと開き、その仕事を進める手がかりを置く。
 * メモ(Google ToDo の「詳細」と同期)、最初の一歩、今やる・終えた・いつかに手放す、Claude に相談。
 * 仕分け(柱と局面)は一行で示し、「直す」を押したときだけ選ぶ欄を開く。
 * placed: 「今」のブロックに置いたもの(今やる・終えた・手放すは、その画面の操作を使う)
 */
export default function ItemDetail({ item, placed = false }: { item: Item; placed?: boolean }) {
  const pillars = usePillars()
  const actions = useItemActions()
  const [notes, setNotes] = useState(item.notes ?? '')
  const [step, setStep] = useState(item.firstStep ?? '')
  const [fixing, setFixing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
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

  const consult = consultUrl(consultText({ body: item.body, dueDate: item.dueDate, notes, firstStep: step, pillar }))
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
          id={`notes-${item.id}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.notes ?? '') && void keep(saveNotes(item.id, notes))}
          className="w-full min-w-0 resize-none border-b border-rule bg-transparent py-1 font-hand text-base leading-relaxed text-ink outline-none"
        />
      </div>
      <div className="flex items-baseline gap-2 border-b border-rule">
        <label htmlFor={`step-${item.id}`} className="shrink-0 font-hand text-[15px] text-ink-3">
          まず、
        </label>
        <input
          id={`step-${item.id}`}
          value={step}
          maxLength={80}
          placeholder="最初の一歩を一行で"
          onChange={(e) => setStep(e.target.value)}
          onBlur={() => step !== (item.firstStep ?? '') && void keep(saveFirstStep(item.id, step))}
          className="min-h-11 min-w-0 flex-1 bg-transparent font-hand text-base text-ink outline-none placeholder:text-ink-3"
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
