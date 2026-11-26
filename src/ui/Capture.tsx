import { useState, type FormEvent } from 'react'
import { addItem } from '../data/items'
import { joinSpoken } from '../domain/speech-text'
import MicButton from './MicButton'
import { useSpeech } from './useSpeech'

// 放り込む(R1、R3)。下線だけの入力欄(スキル)。音声は、マイクのボタンか OS の音声入力で(R2、spec の変更 6)
export default function Capture({ onAdded, onError, className = '' }: { onAdded: () => void; onError: (message: string) => void; className?: string }) {
  const [body, setBody] = useState('')
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
  }

  return (
    <>
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
