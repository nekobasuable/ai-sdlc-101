import { useState } from 'react'
import { clearPillar } from '../data/items'
import { savePillars } from '../data/settings'
import { MAX_LABEL, MAX_PILLARS, newPillarId, pillarIssue, type Pillar } from '../domain/pillars'
import ListMark from './ListMark'

// 人生の柱を直す(spec R4 改、plan/022)。名前を直す、足す、消す、並べ替える。
// 消した柱が付いていた項目は、柱なしに戻る(AI はもう見立てない)
export default function PillarsEditor({ pillars, onSaved }: { pillars: readonly Pillar[]; onSaved: (pillars: Pillar[]) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Pillar[]>([...pillars])
  const [adding, setAdding] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function save(next: Pillar[], removed?: string) {
    // 空の名前や重なった名前は、保存せずに知らせる(黙って除くと、その柱の表示が消えるため)
    const issue = pillarIssue(next)
    // 名前を直すまで、ほかの変更(並べ替えや消すこと)も残らないので、そのことも添える(PR #21 のレビューの Nit)
    if (issue) return setMessage(`${issue}名前を直すと、ほかの変更も残る。`)
    const res = await savePillars(next)
    if (!res.ok) return setMessage('まだ残せていない。つながったら、もう一度。')
    // 柱の一覧は保存できたので、外しきれなかったときも画面の一覧は新しくする(PR #21 のレビューの Nit)
    setDraft(res.data)
    onSaved(res.data)
    if (removed) {
      const cleared = await clearPillar(removed)
      if (!cleared.ok) return setMessage('柱は消したが、やることから外しきれなかった。少しおいて開き直すと、柱なしで表示される。')
    }
    setMessage(null)
  }

  const rename = (i: number, label: string) => setDraft(draft.map((p, j) => (j === i ? { ...p, label } : p)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= draft.length) return
    const next = [...draft]
    ;[next[i], next[j]] = [next[j], next[i]]
    void save(next)
  }

  return (
    <section>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-11 label">
        人生の柱
      </button>
      {open && (
        <div className="mt-1 flex max-w-md flex-col">
          <p className="m-0 mb-2 text-[13px] leading-relaxed text-ink-3">時間を向けたい、人生の部分。やることに、この中から一つずつ付く。</p>
          <ul className="m-0 flex list-none flex-col p-0">
            {draft.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-rule-soft">
                <ListMark className="mt-0" />
                <label htmlFor={`pillar-${p.id}`} className="sr-only">
                  柱の名前
                </label>
                <input
                  id={`pillar-${p.id}`}
                  value={p.label}
                  maxLength={MAX_LABEL}
                  onChange={(e) => rename(i, e.target.value)}
                  onBlur={() => void save(draft)}
                  className="min-h-11 min-w-0 flex-1 bg-transparent font-hand text-base text-ink outline-none"
                />
                <span className="flex shrink-0 font-hand text-sm text-ink-3">
                  <button type="button" aria-label={`${p.label}を上へ`} disabled={i === 0} onClick={() => move(i, -1)} className="min-h-11 px-2 disabled:opacity-30">
                    上へ
                  </button>
                  <button
                    type="button"
                    aria-label={`${p.label}を消す`}
                    disabled={draft.length <= 1}
                    onClick={() => void save(draft.filter((x) => x.id !== p.id), p.id)}
                    className="min-h-11 px-2 disabled:opacity-30"
                  >
                    消す
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {draft.length < MAX_PILLARS && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const label = adding.trim()
                if (!label) return
                setAdding('')
                void save([...draft, { id: newPillarId(), label }])
              }}
              className="mt-2 flex items-center gap-2 border-b border-rule"
            >
              <label htmlFor="pillar-new" className="sr-only">
                柱を足す
              </label>
              <input
                id="pillar-new"
                value={adding}
                maxLength={MAX_LABEL}
                onChange={(e) => setAdding(e.target.value)}
                placeholder="柱を足す"
                className="min-h-11 min-w-0 flex-1 bg-transparent font-hand text-base text-ink outline-none placeholder:text-ink-3"
              />
              <button type="submit" className="min-h-11 shrink-0 font-hand text-sm text-ink-3">
                足す
              </button>
            </form>
          )}
          {message && <p className="m-0 mt-1 text-[13px] text-ink-3">{message}</p>}
        </div>
      )}
    </section>
  )
}
