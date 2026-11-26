import { useEffect, useRef, useState } from 'react'
import { listDailyNotes, saveDailyNote } from '../data/notes'
import type { DailyNoteSlot } from '../domain/daily-note'
import { joinSpoken } from '../domain/speech-text'
import MicButton from './MicButton'
import { useSpeech } from './useSpeech'

// 今日のことを、一言だけ(R17a)。離れると残す。
// 夕方から次の朝までだけ「今」の画面に出し、朝は前の日の一言になる(R17a 補、plan/025)。声でも入れられる
export default function DailyNote({ slot }: { slot: DailyNoteSlot }) {
  const { date, label } = slot
  const [loaded, setLoaded] = useState<{ date: string; note: string } | null>(null)
  // 下書きは日付と一緒に持つ。日付が変わったら前の日の下書きは使わない(PR #7 のレビューの Nit)
  const [draftState, setDraftState] = useState<{ date: string; text: string } | null>(null)
  const draft = draftState?.date === date ? draftState.text : null
  const setDraft = (text: string | null) => setDraftState(text === null ? null : { date, text })
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

  // 聞き取った言葉は、聞き取りを始めたときの文の後ろに足す。止めたら残す(欄を離れたときと同じ)
  const [base, setBase] = useState('')
  const speech = useSpeech((heard) => setDraft(joinSpoken(base, heard, '')))
  function save(text: string | null) {
    if (text === null || text === saved) return
    void saveDailyNote(date, text).then((res) => {
      // 残せたときだけ下書きを確定する。失敗したら書いたものを残す(PR #7 のレビューの指摘)
      setUnsaved(!res.ok)
      if (!res.ok) return
      setLoaded({ date, note: text.trim() })
      setDraft(null)
    })
  }
  // 11時に欄が消えるとき(または日付が変わるとき)、離れる前の下書きも残す(PR #25 のレビューの Nit)
  const pending = useRef<{ date: string; text: string | null; saved: string }>({ date, text: null, saved })
  useEffect(() => {
    pending.current = { date, text: draft, saved }
  })
  useEffect(
    () => () => {
      const { date: d, text, saved: s } = pending.current
      if (text !== null && text !== s) void saveDailyNote(d, text)
    },
    [date],
  )
  const toggleMic = () => {
    if (speech.listening) return speech.stop()
    setBase(value)
    speech.start()
  }
  // 聞き取りが終わったら(止めたときも、黙って自然に終わったときも)残す
  const wasListening = useRef(false)
  useEffect(() => {
    if (wasListening.current && !speech.listening) save(draft)
    wasListening.current = speech.listening
  }, [speech.listening]) // eslint-disable-line react-hooks/exhaustive-deps -- 聞き取りの始まりと終わりだけを見る
  return (
    <section>
      <label htmlFor="daily-note" className="mb-2 block label">
        {label}のことを、一言だけ
      </label>
      <div className="flex items-center gap-2 border-b border-rule">
        <input
          id="daily-note"
          value={value}
          onChange={(e) => {
            // 手で直したら聞き取りを止め、直した文字を残す
            if (speech.listening) speech.stop()
            setDraft(e.target.value)
          }}
          onBlur={() => save(draft)}
          className="min-h-11 min-w-0 flex-1 bg-transparent py-2 font-hand text-base text-ink outline-none"
        />
        {speech.supported && <MicButton listening={speech.listening} onToggle={toggleMic} />}
      </div>
      {speech.error && <p className="m-0 mt-1 text-[13px] text-ink-3">{speech.error}</p>}
      {unsaved && <p className="m-0 mt-1 text-[13px] text-ink-3">まだ残せていない。つながったら、もう一度ここを離れると残る。</p>}
    </section>
  )
}
