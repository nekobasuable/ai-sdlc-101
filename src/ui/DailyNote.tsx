import { useEffect, useState } from 'react'
import { listDailyNotes, saveDailyNote } from '../data/notes'

// 今日のことを、一言だけ(R17a)。離れると残す
export default function DailyNote({ date }: { date: string }) {
  const [loaded, setLoaded] = useState<{ date: string; note: string } | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [unsaved, setUnsaved] = useState(false)

  useEffect(() => {
    let active = true
    void listDailyNotes(date, date).then((res) => {
      if (active && res.ok) setLoaded({ date, note: res.data.get(date) ?? '' })
    })
    return () => {
      active = false
    }
  }, [date])

  const saved = loaded?.date === date ? loaded.note : ''
  const value = draft ?? saved
  return (
    <section>
      <label htmlFor="daily-note" className="mb-2 block text-xs tracking-[0.18em] text-ink-3">
        今日のことを、一言だけ
      </label>
      <input
        id="daily-note"
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft === null || draft === saved) return
          void saveDailyNote(date, draft).then((res) => {
            // 残せたときだけ下書きを確定する。失敗したら書いたものを残す(PR #7 のレビューの指摘)
            setUnsaved(!res.ok)
            if (!res.ok) return
            setLoaded({ date, note: draft.trim() })
            setDraft(null)
          })
        }}
        className="min-h-11 w-full border-b border-rule bg-transparent py-2 font-hand text-base text-ink outline-none"
      />
      {unsaved && <p className="m-0 mt-1 text-xs text-ink-3">まだ残せていない。つながったら、もう一度ここを離れると残る。</p>}
    </section>
  )
}
