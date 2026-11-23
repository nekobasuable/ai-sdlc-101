import { useState, type FormEvent } from 'react'
import { addItem } from '../data/items'

// 放り込む(R1、R3)。音声は OS の音声入力を使う(R2)
export default function Capture({ onAdded, onError }: { onAdded: () => void; onError: (message: string) => void }) {
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
    <form
      onSubmit={submit}
      className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-stone-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-md gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="思いついたことを放り込む"
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-2"
        />
        <button disabled={saving} className="rounded border border-stone-300 px-4 py-2 text-stone-700 disabled:opacity-50">
          入れる
        </button>
      </div>
    </form>
  )
}
