import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { addItem } from '../data/items'
import { flightDuration, planFlight, type CharFlight } from '../domain/flight'
import { joinSpoken } from '../domain/speech-text'
import MicButton from './MicButton'
import { useSpeech } from './useSpeech'

// 放り込む(R1、R3)。下線だけの入力欄(スキル)。音声は、マイクのボタンか OS の音声入力で(R2、spec の変更 6)
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
  // 聞き取りを始めたときの欄の文字。聞き取った文字はこの後ろに足す
  const [base, setBase] = useState('')
  const speech = useSpeech((heard) => setBody(joinSpoken(base, heard, '')))
  const toggleMic = () => {
    if (speech.listening) return speech.stop()
    setBase(body)
    speech.start()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    // 聞き取りの途中に送っても、送った文字が戻ってこないよう、先に止める(PR #9 のレビューの指摘)
    if (speech.listening) speech.stop()
    const text = body.trim()
    if (!text || saving) return
    setSaving(true)
    const res = await addItem(text)
    setSaving(false)
    if (!res.ok) return onError(res.message)
    setBody('')
    onAdded()
    fly(text)
  }

  function fly(text: string) {
    const input = inputRef.current?.getBoundingClientRect()
    const target = document.querySelector('[data-fly-target]')?.getBoundingClientRect()
    if (!input || !target) return
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
    {speech.error && (
      <p className="m-0 pt-1 text-[13px] text-ink-3" role="status">
        {speech.error}
      </p>
    )}
    <form onSubmit={submit} className={`flex items-center gap-2 border-b border-rule ${className}`}>
      <label htmlFor="capture" className="sr-only">
        ふと浮かんだこと
      </label>
      <input
        ref={inputRef}
        id="capture"
        value={body}
        onChange={(e) => {
          // 手で直したら聞き取りを止め、直した文字を残す
          if (speech.listening) speech.stop()
          setBody(e.target.value)
        }}
        placeholder="ふと浮かんだことを"
        enterKeyHint="send"
        className="min-h-11 min-w-0 flex-1 bg-transparent py-3 font-hand text-base text-ink outline-none placeholder:text-ink-3"
      />
      {speech.supported && <MicButton listening={speech.listening} onToggle={toggleMic} />}
      <button type="submit" disabled={saving} aria-label="入れる" className="flex size-11 items-center justify-center text-ink-3 disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
    </>
  )
}
