import { useEffect, useState } from 'react'
import { listCompletedBetween, listWeek, reconsider, type Item, type WeekEntry } from '../data/items'
import { getWeeklyMemo, listDailyNotes, saveWeeklyMemo } from '../data/notes'
import type { AppSettings } from '../data/settings'
import { aboutHours, letGo, timeSpent } from '../domain/review'
import { addDays, weekStartOf } from '../domain/slot'
import { zonedMidnight } from '../domain/time'
import { weekGrid } from '../domain/week-grid'
import type { OwlMood } from './Owl'
import QuoteLine from './QuoteLine'
import Reveal from './Reveal'
import SpeakReflect from './SpeakReflect'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
type Loaded = { weekStart: string; entries: WeekEntry[]; notes: Map<string, string>; memo: string; completed: Item[] }

// 省みる(plan/007 段階 D、R15〜R17a)。数字より先に、やったことと一言を見せる(C2、R16)
/** onOwlMood: 話して省みる間の様子を、上のバーのふくろうに伝える(plan/021) */
export default function ReviewView({ settings, now, onOwlMood }: { settings: AppSettings; now: Date; onOwlMood?: (mood: OwlMood) => void }) {
  const [offset, setOffset] = useState(0) // 0 = 今週、-1 = 先週
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [memoDraft, setMemoDraft] = useState<string | null>(null)
  const [memoUnsaved, setMemoUnsaved] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const tz = settings.timeZone
  const weekStart = addDays(weekStartOf(now, tz), offset * 7)
  const grid = weekGrid(weekStart, now, tz, settings.blocks)

  useEffect(() => {
    let active = true
    const [y, m, d] = weekStart.split('-').map(Number)
    const next = addDays(weekStart, 7).split('-').map(Number)
    void Promise.all([
      listWeek(weekStart),
      listDailyNotes(weekStart, addDays(weekStart, 6)),
      getWeeklyMemo(weekStart),
      listCompletedBetween(zonedMidnight(y, m, d, tz), zonedMidnight(next[0], next[1], next[2], tz)),
    ]).then(([week, notes, memo, completed]) => {
      if (!active || !week.ok || !notes.ok || !memo.ok || !completed.ok) return
      setLoaded({ weekStart, entries: week.data, notes: notes.data, memo: memo.data, completed: completed.data })
      setMemoDraft(null)
    })
    return () => {
      active = false
    }
  }, [weekStart, tz, version])

  // 選び直しの結果。失敗したら一言だけ出す(PR #7 のレビューの Nit)
  const after = (res: { ok: boolean }) => {
    setNotice(res.ok ? null : 'まだ選び直せていない。つながったら、もう一度押せる。')
    if (res.ok) setVersion((v) => v + 1)
  }

  // 話して省みるの「残す」: この週のことに書き足す
  const appendToMemo = async (text: string) => {
    const current = memoDraft ?? loaded?.memo ?? ''
    const next = current.trim() ? `${current.trim()}\n\n${text}` : text
    const res = await saveWeeklyMemo(weekStart, next)
    if (res.ok) setVersion((v) => v + 1)
    return res.ok
  }

  const data = loaded?.weekStart === weekStart ? loaded : null
  const entries = data?.entries ?? []
  const spent = timeSpent(entries, settings.blocks)
  const dropped = letGo(entries, grid)
  const placedIds = new Set(entries.map((e) => e.item.id))
  const otherDone = (data?.completed ?? []).filter((i) => !placedIds.has(i.id))
  const days = grid.filter((day) => day.some((c) => c.time !== 'future'))

  return (
    <section className="relative flex flex-col gap-12">
      <header>
        <h1 className="m-0 font-mincho text-[26px] font-normal tracking-[0.06em]">省みる</h1>
        <div className="mt-2 flex gap-5 font-hand text-[15px]">
          <button type="button" onClick={() => setOffset(0)} className={`min-h-11 ${offset === 0 ? 'text-ink' : 'text-ink-3'}`}>
            今週
          </button>
          <button type="button" onClick={() => setOffset(-1)} className={`min-h-11 ${offset === -1 ? 'text-ink' : 'text-ink-3'}`}>
            先週
          </button>
        </div>
      </header>

      {!data ? (
        <p className="m-0 text-sm text-ink-3">開いています…</p>
      ) : (
        <>
          <div className="flex flex-col gap-7">
            {days.map((day) => {
              const date = day[0].date
              const done = entries.filter((e) => e.day === day[0].day && (e.result === 'done' || e.result === 'partial'))
              const note = data.notes.get(date)
              return (
                <div key={date} className="flex gap-5">
                  <div className="w-11 shrink-0 font-mincho text-ink-2">
                    <div className="text-xl">{Number(date.slice(8))}</div>
                    <div className="text-[13px]">{WEEKDAYS[day[0].day]}</div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 pt-1 text-[15px] leading-relaxed">
                    {done.map((e) => (
                      <span key={e.placementId} className="text-ink-2">
                        {e.item.body}
                        {e.result === 'partial' && <span className="text-ink-3"> · 途中まで</span>}
                      </span>
                    ))}
                    {note && <span className="font-hand text-ink">「{note}」</span>}
                    {done.length === 0 && !note && <span className="font-mincho text-sm tracking-[0.1em] text-ink-3">静かな一日</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {otherDone.length > 0 && (
            <section>
              <h2 className="m-0 mb-3 label font-normal">ほかに終えたこと</h2>
              <p className="m-0 text-[15px] leading-relaxed text-ink-2">{otherDone.map((i) => i.body).join('、')}。</p>
            </section>
          )}

          <Reveal>
            <section>
              <h2 className="m-0 mb-3 label font-normal">時間の使い方</h2>
              {spent.byQuadrant.length === 0 ? (
                <p className="m-0 text-[15px] text-ink-3">まだ、数えるほどの時間はない。</p>
              ) : (
                <div className="flex flex-col gap-1 text-[15px] leading-relaxed text-ink-2">
                  {spent.byQuadrant.map((r) => (
                    <span key={`q-${r.label}`}>
                      {r.label}に、{aboutHours(r.minutes)}。
                    </span>
                  ))}
                  <span className="mt-3" />
                  {spent.byArea.map((r) => (
                    <span key={`a-${r.label}`}>
                      {r.label}に、{aboutHours(r.minutes)}。
                    </span>
                  ))}
                  <span className="mt-2 text-sm text-ink-3">終えた時間はそのまま、途中までは半分として数えている。</span>
                </div>
              )}
            </section>
          </Reveal>

          {dropped.length > 0 && (
            <section>
              <h2 className="m-0 mb-3 label font-normal">手放したこと</h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {dropped.map((e) => (
                  <li key={e.item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-[15px] text-ink-2">
                    <span>{e.item.body}</span>
                    <span className="flex gap-4 font-hand text-sm">
                      <button type="button" onClick={() => void reconsider(e.item.id, 'inbox').then(after)} className="min-h-11 text-ink-3">
                        やることに戻す
                      </button>
                      <button type="button" onClick={() => void reconsider(e.item.id, 'someday').then(after)} className="min-h-11 text-ink-3">
                        いつかに
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {notice && <p className="m-0 mt-1 text-[13px] text-ink-3">{notice}</p>}
            </section>
          )}

          <Reveal>
            <SpeakReflect key={weekStart} onKeep={appendToMemo} onMood={onOwlMood} />
          </Reveal>

          <Reveal>
            <section>
              <label htmlFor="weekly-memo" className="mb-2 block label">
                この週のこと
              </label>
              <textarea
                id="weekly-memo"
                rows={4}
                value={memoDraft ?? data.memo}
                onChange={(e) => setMemoDraft(e.target.value)}
                onBlur={() => {
                  if (memoDraft === null || memoDraft === data.memo) return
                  // 残せたときだけ読み直す(読み直すと下書きが消えるため)。失敗したら書いたものを残す(PR #7 のレビューの指摘)
                  void saveWeeklyMemo(weekStart, memoDraft).then((res) => {
                    setMemoUnsaved(!res.ok)
                    if (res.ok) setVersion((v) => v + 1)
                  })
                }}
                className="w-full resize-none border-b border-rule bg-transparent py-2 font-hand text-base leading-loose text-ink outline-none"
              />
              {memoUnsaved && <p className="m-0 mt-1 text-[13px] text-ink-3">まだ残せていない。つながったら、もう一度ここを離れると残る。</p>}
            </section>
          </Reveal>
        </>
      )}

      <QuoteLine screen="review" now={now} timeZone={tz} />
    </section>
  )
}
