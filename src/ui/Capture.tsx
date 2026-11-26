import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { addItem } from '../data/items'
import { captureFields } from '../domain/capture'
import { flightDuration, planFlight, type CharFlight } from '../domain/flight'
import { fitHeight } from './auto-height'
import DueField from './DueField'

// タスクの追加(R1、R3、R51)。下線だけの入力欄(スキル)。
// パッと入れるための欄なので、マイクは置かない(声は OS の音声入力で。R2、plan/025)。
// 題名を書き始めると、締め切り(〆)とメモを任意で足せる(R51、plan/025)
// 送った文字は一文字ずつ「週」(data-fly-target)へ飛び、着いたら onLanded を呼ぶ(plan/013)。保存に失敗したら飛ばさない
export default function Capture({
  onAdded,
  onError,
  onLanded,
  className = '',
}: {
  onAdded: () => void
  onError: (message: string) => void
  onLanded?: () => void
  className?: string
}) {
  const [body, setBody] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [flight, setFlight] = useState<{ id: number; x: number; y: number; chars: CharFlight[] } | null>(null)
  const [landedNote, setLandedNote] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const [saving, setSaving] = useState(false)
  const [due, setDue] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => fitHeight(notesRef.current), [notes, notesOpen])
  // 何も書いていないときは一行のまま(P2)。締め切りかメモを入れていれば、題名を消しても残す
  const showExtras = body.trim() !== '' || due !== null || notesOpen || notes.trim() !== ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    const fields = captureFields({ body, dueDate: due ?? '', notes })
    if (!fields || saving) return
    setSaving(true)
    const res = await addItem(fields)
    setSaving(false)
    if (!res.ok) return onError(res.message)
    setBody('')
    setDue(null)
    setNotes('')
    setNotesOpen(false)
    onAdded()
    fly(fields.body)
  }

  function fly(text: string) {
    const input = inputRef.current?.getBoundingClientRect()
    const target = document.querySelector('[data-fly-target]')?.getBoundingClientRect()
    if (!input || !target) {
      // 行き先が見つからなくても、着いた知らせは出す(PR #17 のレビューの Nit)
      setLandedNote(true)
      onLanded?.()
      timers.current.push(window.setTimeout(() => setLandedNote(false), 2500))
      return
    }
    const from = { x: input.left, y: input.top + input.height / 2 - 12 }
    const chars = planFlight(text, from, { x: target.left + target.width / 2, y: target.top + target.height / 2 - 12 }, 16)
    timers.current.forEach((t) => window.clearTimeout(t))
    setLandedNote(false)
    setFlight({ id: Date.now(), ...from, chars })
    timers.current = [
      window.setTimeout(() => {
        setFlight(null)
        setLandedNote(true)
        onLanded?.()
      }, flightDuration(chars.length) * 1000),
      window.setTimeout(() => setLandedNote(false), flightDuration(chars.length) * 1000 + 2500),
    ]
  }

  return (
    <>
    {flight && (
      <div key={flight.id} aria-hidden="true" className="pointer-events-none fixed z-50 font-hand text-base whitespace-nowrap text-ink" style={{ left: flight.x, top: flight.y }}>
        {flight.chars.map((c, i) => (
          <span
            key={i}
            className="fly-char absolute top-0"
            style={{ left: c.left, '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--r': `${c.rotate}deg`, animationDelay: `${c.delay}s` } as CSSProperties}
          >
            {c.ch}
          </span>
        ))}
      </div>
    )}
    {landedNote && (
      <p className="fade-up m-0 pt-1 text-[13px] text-ink-2" role="status">
        やることに入った。
      </p>
    )}
    <form onSubmit={submit} className={className}>
      <div className="flex items-center gap-2 border-b border-rule">
      <label htmlFor="capture" className="sr-only">
        タスクの追加
      </label>
      <input
        ref={inputRef}
        id="capture"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="タスクの追加"
        enterKeyHint="send"
        className="min-h-11 min-w-0 flex-1 bg-transparent py-3 font-hand text-base text-ink outline-none placeholder:text-ink-3"
      />
      <button type="submit" disabled={saving} aria-label="入れる" className="flex size-11 items-center justify-center text-ink-3 disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      </div>
      {showExtras && (
        <div className="fade-up flex flex-col">
          <div className="flex flex-wrap items-center gap-x-5">
            <DueField id="capture-due" value={due} onChange={setDue} />
            <button type="button" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)} className="min-h-11 font-hand text-sm text-ink-3">
              メモ
            </button>
          </div>
          {notesOpen && (
            <>
              <label htmlFor="capture-notes" className="sr-only">
                メモ
              </label>
              <textarea
                ref={notesRef}
                id="capture-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="max-h-[50vh] w-full min-w-0 resize-none overflow-y-auto border-b border-rule bg-transparent py-1 font-hand text-base leading-relaxed text-ink outline-none"
              />
            </>
          )}
        </div>
      )}
    </form>
    </>
  )
}
