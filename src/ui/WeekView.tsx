import { useEffect, useState } from 'react'
import { fetchEvents } from '../data/calendar'
import { listCandidates, listDue, listPlacementsFrom, placeNow, unplace, type Item, type WeekEntry } from '../data/items'
import type { AppSettings } from '../data/settings'
import { placeEvents, type PlacedEvent } from '../domain/calendar-blocks'
import { secondQuadrantFirst } from '../domain/quadrant'
import { addDays } from '../domain/slot'
import { zonedMidnight } from '../domain/time'
import { cellKey, daysGrid, LOW_SLACK, slackRatio, todayOf, type Cell } from '../domain/week-grid'
import QuoteLine from './QuoteLine'
import Reveal from './Reveal'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const RESULT_LABEL: Record<string, string> = { done: '終えた', partial: '途中まで', not_done: '手放した' }

// 週(R8 改、R10、R11、R13a)。今日から7日を、「今」の積み重ねとして見せる(P7、plan/019)。見た目はスキル life-dashboard-look
export default function WeekView({ settings, now, version: outer, onChanged }: { settings: AppSettings; now: Date; version: number; onChanged: () => void }) {
  const [offset, setOffset] = useState(0) // 0 = 今日から7日、1 = その先の7日
  // どの7日の内容かを一緒に持ち、切り替えた直後に前の7日の内容を重ねて見せない
  const [loaded, setLoaded] = useState<{ start: string; entries: WeekEntry[] } | null>(null)
  const [candidates, setCandidates] = useState<Item[]>([])
  const [events, setEvents] = useState<{ start: string; placed: PlacedEvent[] } | null>(null)
  const [due, setDue] = useState<{ start: string; items: Item[] } | null>(null)
  const [drawing, setDrawing] = useState<{ day: number; blockId: string | null } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const start = addDays(todayOf(now, settings.timeZone), offset * 7)
  const grid = daysGrid(start, now, settings.timeZone, settings.blocks)

  useEffect(() => {
    let active = true
    void Promise.all([listPlacementsFrom(start), listCandidates()]).then(([week, cands]) => {
      if (!active) return
      if (!week.ok) return setMessage(week.message)
      if (!cands.ok) return setMessage(cands.message)
      setLoaded({ start, entries: week.data })
      setCandidates(cands.data)
    })
    // 締め切りのあるもの(spec R39)
    void listDue({ from: start, to: addDays(start, 6) }).then((res) => {
      if (active && res.ok) setDue({ start, items: res.data })
    })
    // カレンダーの予定(spec R9)。読めなくても週の画面は使える
    // placeEvents は初日からの日数で並べるので、7日の初日を渡す
    const [y, m, d] = start.split('-').map(Number)
    const next = addDays(start, 7).split('-').map(Number)
    void fetchEvents(zonedMidnight(y, m, d, settings.timeZone), zonedMidnight(next[0], next[1], next[2], settings.timeZone)).then((res) => {
      if (active && res.ok) setEvents({ start, placed: placeEvents(res.data, start, settings.timeZone, settings.blocks) })
    })
    return () => {
      active = false
    }
  }, [start, version, outer, settings.timeZone, settings.blocks])

  async function run(action: Promise<{ ok: boolean; message?: string }>) {
    const res = await action
    if (!res.ok) return setMessage(res.message ?? null)
    setMessage(null)
    setDrawing(null)
    setVersion((v) => v + 1)
    onChanged()
  }

  const entries = loaded?.start === start ? loaded.entries : []
  const weekEvents = events?.start === start ? events.placed : []
  const weekDue = due?.start === start ? due.items : []
  const filled = new Set(entries.map((e) => cellKey(e.date, e.blockId)))
  const slack = slackRatio(grid, filled)

  return (
    <section className="flex flex-col gap-10">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="m-0 font-mincho text-[26px] font-normal tracking-[0.06em]">{offset === 0 ? 'これからの7日' : 'その先の7日'}</h1>
          <div className="flex gap-5 font-hand text-[15px]">
            <button type="button" onClick={() => setOffset(0)} className={`min-h-11 ${offset === 0 ? 'text-ink' : 'text-ink-3'}`}>
              これから
            </button>
            <button type="button" onClick={() => setOffset(1)} className={`min-h-11 ${offset === 1 ? 'text-ink' : 'text-ink-3'}`}>
              その先
            </button>
          </div>
        </div>
        <p className="m-0 mt-3 text-[13px] leading-loose text-ink-3">
          一週間は、今の積み重ね。
          <br />
          描いた予定は、地図であって約束ではない。
        </p>
      </header>

      {message && <p className="m-0 text-sm text-ink-3">{message}</p>}
      {loaded?.start !== start ? (
        <p className="m-0 text-sm text-ink-3">開いています…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grid.map((day) => (
            <Reveal key={day[0].date}>
              <Day
                cells={day}
                entries={entries.filter((e) => e.date === day[0].date)}
                events={weekEvents.filter((e) => e.day === day[0].day)}
                due={weekDue.filter((i) => i.dueDate === day[0].date)}
                candidates={candidates}
                drawing={drawing?.day === day[0].day ? drawing : null}
                onDraw={(blockId) => setDrawing({ day: day[0].day, blockId })}
                onClose={() => setDrawing(null)}
                onPlace={(item, blockId) => run(placeNow(item.id, { weekStart: day[0].weekStart, day: day[0].weekday, blockId }))}
                onUnplace={(entry) => run(unplace(entry))}
              />
            </Reveal>
          ))}
        </div>
      )}

      <footer className="flex flex-col gap-6 border-t border-rule-soft pt-5">
        <p className="m-0 text-[13px] text-ink-3">
          余白、およそ{Math.round(slack * 10)}割。{slack < LOW_SLACK && '少しだけ、詰まりぎみ。'}
        </p>
        <QuoteLine screen="week" now={now} timeZone={settings.timeZone} />
      </footer>
    </section>
  )
}

function Day({
  cells,
  entries,
  events,
  due,
  candidates,
  drawing,
  onDraw,
  onClose,
  onPlace,
  onUnplace,
}: {
  cells: Cell[]
  entries: WeekEntry[]
  events: PlacedEvent[]
  due: Item[]
  candidates: Item[]
  drawing: { blockId: string | null } | null
  onDraw: (blockId: string | null) => void
  onClose: () => void
  onPlace: (item: Item, blockId: string) => void
  onUnplace: (entry: WeekEntry) => void
}) {
  const first = cells[0]
  const isPast = cells.every((c) => c.time === 'past')
  const isToday = cells.some((c) => c.time === 'now') || (cells.some((c) => c.time === 'past') && cells.some((c) => c.time === 'future'))
  const openBlocks = cells.filter((c) => c.time !== 'past')
  const pickBlock = drawing?.blockId ? cells.find((c) => c.block.id === drawing.blockId) : null

  return (
    <div className="flex gap-5">
      <div className={`w-11 shrink-0 font-mincho ${isPast ? 'text-ink-3' : isToday ? 'text-ink' : 'text-ink-2'}`}>
        <div className="text-xl">{Number(first.date.slice(8))}</div>
        <div className="text-[13px]">{WEEKDAYS[first.weekday]}</div>
        {openBlocks.length > 0 && (
          <button
            type="button"
            aria-label={drawing ? '閉じる' : `${Number(first.date.slice(8))}日に予定を置く`}
            aria-expanded={Boolean(drawing)}
            onClick={() => (drawing ? onClose() : onDraw(null))}
            className="-ml-3 flex size-11 items-center justify-center text-ink-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              {drawing ? <path d="M6 12h12" /> : <path d="M12 5v14M5 12h14" />}
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pt-1 text-[15px] leading-relaxed">
        {events.filter((e) => e.time === null).map((e) => (
          <span key={`${e.id}-allday`} className="text-sm text-ink-3">
            一日、{e.title}
          </span>
        ))}
        {due.map((i) => (
          <span key={`due-${i.id}`} className="text-sm text-ink-3">
            〆　{i.body}
          </span>
        ))}
        {entries.length === 0 && events.length === 0 && due.length === 0 && (
          <span className="font-mincho text-sm tracking-[0.1em] text-ink-3">余白の一日</span>
        )}
        {events
          .filter((e) => e.time !== null)
          .map((e) => (
            <span key={e.id} className="text-sm text-ink-3">
              {e.time}　{e.title}
            </span>
          ))}
        {cells.map((cell) =>
          entries
            .filter((e) => e.blockId === cell.block.id)
            .map((e) => (
              <div
                key={e.placementId}
                className={`flex items-baseline justify-between gap-3 ${cell.time === 'now' ? 'border-l border-ink pl-3 text-ink' : cell.time === 'past' ? 'text-ink-3' : 'text-ink-2'}`}
              >
                <span>
                  {cell.block.label}　{e.item.body}
                  {e.result && <span className="text-ink-3"> · {RESULT_LABEL[e.result]}</span>}
                </span>
                {cell.time !== 'past' && !e.result && (
                  <button type="button" onClick={() => onUnplace(e)} className="min-h-11 shrink-0 font-hand text-sm text-ink-3">
                    外す
                  </button>
                )}
              </div>
            )),
        )}
        {drawing && (
          <div className="flex flex-col gap-2 border-l border-rule pl-4">
            <div className="flex flex-wrap gap-x-4 font-hand text-[15px]">
              {openBlocks.map((c) => (
                <button
                  key={c.block.id}
                  type="button"
                  onClick={() => onDraw(c.block.id)}
                  className={`min-h-11 ${drawing.blockId === c.block.id ? 'text-ink underline decoration-rule underline-offset-[6px]' : 'text-ink-3'}`}
                >
                  {c.block.label}
                </button>
              ))}
            </div>
            {pickBlock && (
              <ul className="m-0 flex list-none flex-col p-0">
                {secondQuadrantFirst(candidates.filter((c) => !entries.some((e) => e.blockId === pickBlock.block.id && e.item.id === c.id))).map(
                  (item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => onPlace(item, pickBlock.block.id)} className="min-h-11 text-left text-[15px] text-ink-2">
                        {item.body}
                        {item.quadrant === 2 && <span className="font-hand text-sm text-ink-3">　大切で、急がないこと</span>}
                      </button>
                    </li>
                  ),
                )}
                {candidates.length === 0 && <li className="text-sm text-ink-3">置けるものは、いまはない。</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
