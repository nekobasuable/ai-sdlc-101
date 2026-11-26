import { useEffect, useState } from 'react'
import { addItem } from '../data/items'
import { draftReflection, type Reflection } from '../data/reflect'
import { joinSpoken } from '../domain/speech-text'
import MicButton from './MicButton'
import type { OwlMood } from './Owl'
import { useSpeech } from './useSpeech'

// サーバー側の関数の上限と同じ(supabase/functions/_shared/reflect.ts の MAX_INPUT)
const MAX_INPUT = 4000

// 話して省みる(plan/011、spec R40、R41)。AI は下書きまで。何を残すかは本人が選ぶ(C9)
// ふくろうの様子を呼ぶ側に知らせる(plan/013): 聞いている間、整えている間、下書きが出たとき
export default function SpeakReflect({ onKeep, onMood }: { onKeep: (text: string) => Promise<boolean>; onMood?: (mood: OwlMood) => void }) {
  const [spoken, setSpoken] = useState('')
  const [base, setBase] = useState('')
  const speech = useSpeech((heard) => setSpoken(joinSpoken(base, heard, '\n').slice(0, MAX_INPUT)))
  const toggleMic = () => {
    if (speech.listening) return speech.stop()
    setBase(spoken)
    speech.start()
  }
  const [draft, setDraft] = useState<Reflection | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [nodding, setNodding] = useState(false)
  const mood: OwlMood = speech.listening ? 'listen' : busy ? 'think' : nodding ? 'nod' : null
  useEffect(() => onMood?.(mood), [mood]) // eslint-disable-line react-hooks/exhaustive-deps
  // 週を切り替えて作り直されるとき、ふくろうを元の姿に戻す(PR #17 のレビューの指摘)
  useEffect(() => () => onMood?.(null), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!nodding) return
    const t = window.setTimeout(() => setNodding(false), 2500)
    return () => window.clearTimeout(t)
  }, [nodding])
  // 「残す」の途中で失敗したとき、押し直しで成功した分をやり直さないよう、済んだものを覚えておく(PR #8 のレビューの指摘)
  const [memoKept, setMemoKept] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const resetProgress = () => {
    setMemoKept(false)
    setAdded(new Set())
  }

  async function arrange() {
    // 下書きを出すとマイクのボタンが消えるので、先に聞き取りを止める(PR #9 のレビューの Nit)
    if (speech.listening) speech.stop()
    if (!spoken.trim() || busy) return
    setBusy(true)
    const res = await draftReflection(spoken)
    setBusy(false)
    if (!res.ok) return setMessage(res.message)
    setMessage(null)
    setDraft(res.data)
    setNodding(true)
    setPicked(new Set())
    resetProgress()
  }

  async function keep(text: string, carry: string[]) {
    if (speech.listening) speech.stop()
    setBusy(true)
    let memoDone = memoKept
    if (!memoDone && text) {
      memoDone = await onKeep(text)
      if (memoDone) setMemoKept(true)
    }
    const nowAdded = new Set(added)
    for (const c of carry) {
      if (nowAdded.has(c)) continue
      const res = await addItem(c)
      if (res.ok) nowAdded.add(c)
    }
    setAdded(nowAdded)
    setBusy(false)
    const allDone = (memoDone || !text) && carry.every((c) => nowAdded.has(c))
    if (!allDone) return setMessage('まだ残せていないものがある。つながったら、もう一度押すと、残りだけを残す。')
    setMessage(null)
    setSpoken('')
    setDraft(null)
    resetProgress()
  }

  const link = 'min-h-11 font-hand text-[15px] text-ink underline decoration-rule underline-offset-[6px] disabled:opacity-40'
  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor="speak" className="label">
          話して省みる
        </label>
        {speech.supported && !draft && <MicButton listening={speech.listening} onToggle={toggleMic} />}
      </div>
      <textarea
        id="speak"
        rows={4}
        value={spoken}
        onChange={(e) => {
          // 手で直したら聞き取りを止め、直した文字を残す(PR #9 のレビューの Nit)
          if (speech.listening) speech.stop()
          setSpoken(e.target.value)
        }}
        placeholder="思ったことを、そのまま"
        maxLength={MAX_INPUT}
        className={`w-full resize-none border-b border-rule bg-transparent py-2 font-hand text-base leading-loose text-ink transition-opacity duration-1000 outline-none placeholder:text-ink-3 ${busy ? 'opacity-40' : ''}`}
      />
      {spoken.length > MAX_INPUT - 300 && <p className="m-0 mt-1 text-[13px] text-ink-3">あと {MAX_INPUT - spoken.length} 文字まで。</p>}
      {speech.error && <p className="m-0 mt-1 text-[13px] text-ink-3">{speech.error}</p>}
      {!draft && (
        <div className="mt-1 flex gap-5">
          <button type="button" disabled={busy || !spoken.trim()} onClick={arrange} className={link}>
            {busy ? '整えています…' : '整える'}
          </button>
          <button type="button" disabled={busy || !spoken.trim()} onClick={() => keep(spoken.trim(), [])} className="min-h-11 font-hand text-[15px] text-ink-3 disabled:opacity-40">
            そのまま残す
          </button>
        </div>
      )}

      {draft && (
        <div className="relative mt-6 flex flex-col gap-6 pl-4">
          {/* 左の括弧の線を上から引いてから、4つの項目を順に書き込む(plan/013) */}
          <span aria-hidden="true" className="draw-down absolute top-0 bottom-0 left-0 w-px bg-rule" />
          <div className="ink-write" style={{ animationDelay: '0.4s' }}>
            <label htmlFor="draft-words" className="mb-1 block label">
              この週の言葉
            </label>
            <textarea
              id="draft-words"
              rows={3}
              value={draft.words}
              onChange={(e) => setDraft({ ...draft, words: e.target.value })}
              className="w-full resize-none border-b border-rule bg-transparent py-1 font-mincho text-base leading-loose text-ink outline-none"
            />
          </div>
          {draft.insights.length > 0 && (
            <div className="ink-write" style={{ animationDelay: '1.0s' }}>
              <p className="m-0 mb-1 label">気づいたこと</p>
              {draft.insights.map((t, i) => (
                <input
                  key={i}
                  aria-label={`気づいたこと ${i + 1}`}
                  value={t}
                  onChange={(e) => setDraft({ ...draft, insights: draft.insights.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="min-h-11 w-full border-b border-rule-soft bg-transparent text-[15px] text-ink-2 outline-none"
                />
              ))}
            </div>
          )}
          {draft.carry.length > 0 && (
            <div className="ink-write" style={{ animationDelay: '1.6s' }}>
              <p className="m-0 mb-1 label">来週に持っていきたいこと</p>
              {draft.carry.map((t, i) => (
                <label key={i} className="flex min-h-11 items-center gap-3 text-[15px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={picked.has(i)}
                    onChange={() => setPicked((p) => (p.has(i) ? new Set([...p].filter((x) => x !== i)) : new Set([...p, i])))}
                  />
                  {t}
                </label>
              ))}
              <p className="m-0 text-[13px] text-ink-3">選んだものは、やることに入る。</p>
            </div>
          )}
          {draft.letGo.length > 0 && (
            <div className="ink-write" style={{ animationDelay: '2.2s' }}>
              <p className="m-0 mb-1 label">手放してよさそうなこと</p>
              <p className="m-0 text-[15px] leading-relaxed text-ink-2">{draft.letGo.join('、')}。</p>
            </div>
          )}
          <div className="flex gap-5">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                keep(
                  [draft.words, ...draft.insights].filter((t) => t.trim()).join('\n'),
                  draft.carry.filter((_, i) => picked.has(i)),
                )
              }
              className={link}
            >
              残す
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(null)
                resetProgress()
              }}
              className="min-h-11 font-hand text-[15px] text-ink-3"
            >
              話し直す
            </button>
          </div>
        </div>
      )}
      {message && <p className="m-0 mt-2 text-[13px] text-ink-3">{message}</p>}
    </section>
  )
}
