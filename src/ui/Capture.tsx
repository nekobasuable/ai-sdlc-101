import { useState, type FormEvent } from 'react'
import { addItem } from '../data/items'

// 放り込む(R1、R3)。下線だけの入力欄(スキル)。音声は OS の音声入力を使う(R2)
export default function Capture({ onAdded, onError, className = '' }: { onAdded: () => void; onError: (message: string) => void; className?: string }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
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
    <form onSubmit={submit} className={`flex items-center gap-2 border-b border-rule ${className}`}>
      <label htmlFor="capture" className="sr-only">
        ふと浮かんだこと
      </label>
      <input
        id="capture"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="ふと浮かんだことを"
        enterKeyHint="send"
        className="min-h-11 min-w-0 flex-1 bg-transparent py-3 font-hand text-base text-ink outline-none placeholder:text-ink-3"
      />
      <button type="submit" disabled={saving} aria-label="入れる" className="flex size-11 items-center justify-center text-ink-3 disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}
