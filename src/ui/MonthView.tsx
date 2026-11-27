import { useEffect, useState } from 'react'
import { fetchEvents } from '../data/calendar'
import { listCompletedWithTimes, listDue, listPlacementsBetween, type Item } from '../data/items'
import type { AppSettings } from '../data/settings'
import { placeEvents } from '../domain/calendar-blocks'
import { collectByDate, monthGrid, shiftMonth, type DayContent } from '../domain/month-grid'
import { addDays } from '../domain/slot'
import { zonedMidnight, zonedParts } from '../domain/time'
import { todayOf } from '../domain/week-grid'
import ItemDetail from './ItemDetail'
import ListMark from './ListMark'
import QuoteLine from './QuoteLine'
import Reveal from './Reveal'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
/** PC の格子で、1日に書く行の数。多い日は「ほか N」 */
const LINES = 3

// 月のカレンダー(spec R48、plan/021)。予定、締め切り、置いた予定、終えたことを日ごとに見渡す。
// 置くのは週の画面で(ここでは見るだけ)。目標値や達成率、評価の色は出さない(R16)
export default function MonthView({ settings, now, version }: { settings: AppSettings; now: Date; version: number }) {
  const tz = settings.timeZone
  const today = todayOf(now, tz)
  const p = zonedParts(now, tz)
  const [shown, setShown] = useState({ year: p.year, month: p.month })
  const [picked, setPicked] = useState<string | null>(today)
  // どの月の中身かを一緒に持ち、切り替えた直後に前の月の中身を重ねない
  const [loaded, setLoaded] = useState<{ key: string; days: Map<string, DayContent<Item>>; failed: boolean } | null>(null)

  const grid = monthGrid(shown.year, shown.month, today)
  const start = grid[0][0].date
  const end = grid[grid.length - 1][6].date
  const key = `${shown.year}-${shown.month}`

  useEffect(() => {
    let active = true
    const [y1, m1, d1] = start.split('-').map(Number)
    const [y2, m2, d2] = addDays(end, 1).split('-').map(Number)
    const from = zonedMidnight(y1, m1, d1, tz)
    const to = zonedMidnight(y2, m2, d2, tz)
    const days = grid.length * 7
    // 4つを同時に読む。カレンダーが読めなくても、ほかは出す
    void Promise.all([listPlacementsBetween(start, end), listDue({ from: start, to: end }), listCompletedWithTimes(from, to), fetchEvents(from, to)]).then(
      ([placed, due, done, events]) => {
        if (!active) return
        setLoaded({
          key,
          // どれかが読めなかったら、「余白」と見分けられるように覚えておく(PR #19 のレビューの Nit)
          failed: !placed.ok || !due.ok || !done.ok || !events.ok,
          days: collectByDate(start, {
            events: events.ok ? placeEvents(events.data, start, tz, settings.blocks, days) : [],
            due: due.ok ? due.data : [],
            placed: placed.ok ? placed.data.map((e) => ({ date: e.date, body: e.item.body, itemId: e.item.id, result: e.result })) : [],
            done: done.ok ? done.data.map((d) => ({ date: todayOf(d.at, tz), body: d.item.body, itemId: d.item.id })) : [],
          }),
        })
      },
    ).catch(() => {
      // 通信の例外でも「開いています…」のままにしない
      if (active) setLoaded({ key, days: new Map(), failed: true })
    })
    return () => {
      active = false
    }
    // grid は shown と today から決まるので、key と境目の日付で足りる
  }, [key, start, end, tz, settings.blocks, version]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = loaded?.key === key ? loaded.days : null
  const failed = loaded?.key === key && loaded.failed
  const move = (delta: number) => {
    setShown(shiftMonth(shown.year, shown.month, delta))
    setPicked(null)
  }
  const isThisMonth = shown.year === p.year && shown.month === p.month
  const pickedContent = picked ? days?.get(picked) : undefined

  return (
    <section className="flex flex-col gap-8">
      <header className="flex items-baseline justify-between">
        <h1 className="m-0 font-mincho text-[26px] font-normal tracking-[0.06em]">
          {shown.year !== p.year && <span className="mr-2 text-lg text-ink-3">{shown.year}年</span>}
          {shown.month}月
        </h1>
        <div className="flex gap-5 font-hand text-[15px]">
          <button type="button" onClick={() => move(-1)} className="min-h-11 text-ink-3">
            前の月
          </button>
          <button
            type="button"
            onClick={() => {
              setShown({ year: p.year, month: p.month })
              setPicked(today)
            }}
            className={`min-h-11 ${isThisMonth ? 'text-ink' : 'text-ink-3'}`}
          >
            今月
          </button>
          <button type="button" onClick={() => move(1)} className="min-h-11 text-ink-3">
            次の月
          </button>
        </div>
      </header>

      <div>
        <div className="grid grid-cols-7 border-b border-rule-soft pb-2 text-center label">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        {!days && <p className="m-0 mt-4 text-sm text-ink-3">開いています…</p>}
        {failed && <p className="m-0 mt-3 text-[13px] text-ink-3">いくつか読めなかった。少しおいて開き直すと、読めることがある。</p>}
        {days &&
          grid.map((week) => (
            <div key={week[0].date} className="grid grid-cols-7 border-b border-rule-soft">
              {week.map((d) => {
                const c = days.get(d.date)
                const lines = c ? [...c.events.map((e) => (e.time ? `${e.time} ${e.title}` : e.title)), ...c.due.map((d) => `〆 ${d.body}`), ...c.placed.filter((x) => !x.done).map((x) => x.body)] : []
                // 終えたこと(置いた予定で終えたものも含む)は、行にせず数だけ薄く
                const doneCount = c ? c.done.length + c.placed.filter((x) => x.done).length : 0
                const count = lines.length + doneCount
                const isPicked = picked === d.date
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setPicked(isPicked ? null : d.date)}
                    aria-pressed={isPicked}
                    aria-label={`${Number(d.date.slice(5, 7))}月${d.day}日${count ? `、${count}件` : ''}`}
                    className={`flex min-h-16 flex-col items-stretch gap-0.5 px-1 py-1.5 text-left lg:min-h-28 lg:px-2 ${isPicked ? 'bg-rule-soft/60' : ''} ${d.inMonth ? '' : 'opacity-45'}`}
                  >
                    <span
                      className={`font-mincho text-[15px] ${d.time === 'today' ? 'self-start border-b border-ink text-ink' : d.time === 'past' ? 'text-ink-3' : 'text-ink-2'}`}
                    >
                      {d.day}
                    </span>
                    {/* スマホ: 印だけ。PC: 数行だけ書き、多い日は「ほか N」 */}
                    {count > 0 && (
                      <span className="flex gap-1 lg:hidden" aria-hidden="true">
                        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                          <span key={i} className="size-1 rounded-full bg-ink-3" />
                        ))}
                      </span>
                    )}
                    <span className={`hidden flex-col gap-0.5 text-[13px] leading-snug lg:flex ${d.time === 'past' ? 'text-ink-3' : 'text-ink-2'}`}>
                      {lines.slice(0, LINES).map((l, i) => (
                        <span key={i} className="truncate">
                          {l}
                        </span>
                      ))}
                      {lines.length > LINES && <span className="text-ink-3">ほか {lines.length - LINES}</span>}
                      {doneCount > 0 && <span className="text-ink-3">終えた {doneCount}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
      </div>

      {picked && days && (
        <Reveal className="flex flex-col gap-5">
          <p className="m-0 label">
            {Number(picked.slice(5, 7))}月{Number(picked.slice(8))}日のこと
          </p>
          {!pickedContent || (pickedContent.events.length + pickedContent.due.length + pickedContent.placed.length + pickedContent.done.length === 0) ? (
            <p className="m-0 font-mincho text-[15px] tracking-[0.1em] text-ink-3">{failed ? '読めなかった分がある。' : '余白の一日'}</p>
          ) : (
            <>
              <DayList title="予定" items={pickedContent.events.map((e) => (e.time ? `${e.time}　${e.title}` : `一日、${e.title}`))} />
              <DueList items={pickedContent.due} />
              <DayList title="置いた予定" items={pickedContent.placed.map((x) => (x.done ? `${x.body}(終えた)` : x.body))} />
              <DayList title="終えたこと" items={pickedContent.done} faint />
            </>
          )}
        </Reveal>
      )}

      <footer className="border-t border-rule-soft pt-5">
        <QuoteLine screen="month" now={now} timeZone={tz} />
      </footer>
    </section>
  )
}

function DayList({ title, items, faint = false }: { title: string; items: string[]; faint?: boolean }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="m-0 mb-1 text-[13px] text-ink-3">{title}</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((t, i) => (
          <li key={i} className={`flex items-start gap-3 py-2 text-base leading-relaxed ${faint ? 'text-ink-2' : 'text-ink'}`}>
            <ListMark />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 締め切りの一覧。行を押すと、やることの一覧と同じ詳細が開く(plan/027。PR #19 からの持ち越し) */
function DueList({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (items.length === 0) return null
  return (
    <div>
      <p className="m-0 mb-1 text-[13px] text-ink-3">〆</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item) => (
          <li key={item.id}>
            <div className="flex items-start gap-3 text-base leading-relaxed text-ink">
              <ListMark />
              <button type="button" aria-expanded={open === item.id} onClick={() => setOpen(open === item.id ? null : item.id)} className="min-h-11 flex-1 py-2 text-left">
                {item.body}
              </button>
            </div>
            {open === item.id && <ItemDetail item={item} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
