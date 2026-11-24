import { useState } from 'react'
import { addItem } from '../data/items'
import { draftReflection, type Reflection } from '../data/reflect'

// 話して省みる(plan/011、spec R40、R41)。AI は下書きまで。何を残すかは本人が選ぶ(C9)
export default function SpeakReflect({ onKeep }: { onKeep: (text: string) => Promise<boolean> }) {
  const [spoken, setSpoken] = useState('')
  const [draft, setDraft] = useState<Reflection | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // 「残す」の途中で失敗したとき、押し直しで成功した分をやり直さないよう、済んだものを覚えておく(PR #8 のレビューの指摘)
  const [memoKept, setMemoKept] = useState(false)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const resetProgress = () => {
    setMemoKept(false)
    setAdded(new Set())
  }

  async function arrange() {
    if (!spoken.trim() || busy) return
    setBusy(true)
    const res = await draftReflection(spoken)
    setBusy(false)
    if (!res.ok) return setMessage(res.message)
    setMessage(null)
    setDraft(res.data)
    setPicked(new Set())
    resetProgress()
  }

  async function keep(text: string, carry: string[]) {
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
      <label htmlFor="speak" className="mb-2 block text-xs tracking-[0.18em] text-ink-3">
        話して省みる
      </label>
      <textarea
        id="speak"
        rows={4}
        value={spoken}
        onChange={(e) => setSpoken(e.target.value)}
        placeholder="思ったことを、そのまま"
        className="w-full resize-none border-b border-rule bg-transparent py-2 font-hand text-base leading-loose text-ink outline-none placeholder:text-ink-3"
      />
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
        <div className="mt-6 flex flex-col gap-6 border-l border-rule pl-4">
          <div>
            <label htmlFor="draft-words" className="mb-1 block text-xs tracking-[0.18em] text-ink-3">
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
            <div>
              <p className="m-0 mb-1 text-xs tracking-[0.18em] text-ink-3">気づいたこと</p>
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
            <div>
              <p className="m-0 mb-1 text-xs tracking-[0.18em] text-ink-3">来週に持っていきたいこと</p>
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
              <p className="m-0 text-xs text-ink-3">選んだものは、やることに入る。</p>
            </div>
          )}
          {draft.letGo.length > 0 && (
            <div>
              <p className="m-0 mb-1 text-xs tracking-[0.18em] text-ink-3">手放してよさそうなこと</p>
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
      {message && <p className="m-0 mt-2 text-xs text-ink-3">{message}</p>}
    </section>
  )
}
