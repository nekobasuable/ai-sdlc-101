import { useEffect, useState } from 'react'
import { listCandidates, listWeek, placeNow, unplace, type Item, type WeekEntry } from '../data/items'
import type { AppSettings } from '../data/settings'
import { addDays, weekStartOf } from '../domain/slot'
import { cellKey, LOW_SLACK, slackRatio, weekGrid, type Cell } from '../domain/week-grid'
import QuoteLine from './QuoteLine'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const RESULT_LABEL: Record<string, string> = { done: '終えた', partial: '途中まで', not_done: '手放した' }

// 週(R8、R10、R11、R13a)。1週間は「今」の積み重ねとして見せる(P7)。見た目はスキル life-dashboard-look
export default function WeekView({ settings, now, onChanged }: { settings: AppSettings; now: Date; onChanged: () => void }) {
  const [offset, setOffset] = useState(0) // 0 = 今週、1 = 来週
  // どの週の内容かを一緒に持ち、週を切り替えた直後に前の週の内容を重ねて見せない
  const [loaded, setLoaded] = useState<{ weekStart: string; entries: WeekEntry[] } | null>(null)
  const [candidates, setCandidates] = useState<Item[]>([])
  const [drawing, setDrawing] = useState<{ day: number; blockId: string | null } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const weekStart = addDays(weekStartOf(now, settings.timeZone), offset * 7)
  const grid = weekGrid(weekStart, now, settings.timeZone, settings.blocks)

  useEffect(() => {
    let active = true
    void Promise.all([listWeek(weekStart), listCandidates()]).then(([week, cands]) => {
      if (!active) return
      if (!week.ok) return setMessage(week.message)
      if (!cands.ok) return setMessage(cands.message)
      setLoaded({ weekStart, entries: week.data })
      setCandidates(cands.data)
    })
    return () => {
      active = false
    }
  }, [weekStart, version])

  async function run(action: Promise<{ ok: boolean; message?: string }>) {
    const res = await action
    if (!res.ok) return setMessage(res.message ?? null)
    setMessage(null)
    setDrawing(null)
    setVersion((v) => v + 1)
    onChanged()
  }

  const entries = loaded?.weekStart === weekStart ? loaded.entries : []
  const filled = new Set(entries.map((e) => cellKey(e.day, e.blockId)))
  const slack = slackRatio(grid, filled)

  return (
    <section className="flex flex-col gap-10">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="m-0 font-mincho text-[26px] font-normal tracking-[0.06em]">{offset === 0 ? '今週' : '来週'}</h1>
          <div className="flex gap-5 font-hand text-[15px]">
            <button type="button" onClick={() => setOffset(0)} className={`min-h-11 ${offset === 0 ? 'text-ink' : 'text-ink-4'}`}>
              今週
            </button>
            <button type="button" onClick={() => setOffset(1)} className={`min-h-11 ${offset === 1 ? 'text-ink' : 'text-ink-4'}`}>
              来週
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
      {loaded?.weekStart !== weekStart ? (
        <p className="m-0 text-sm text-ink-3">開いています…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grid.map((day) => (
            <Day
              key={day[0].date}
              cells={day}
              entries={entries.filter((e) => e.day === day[0].day)}
              candidates={candidates}
              drawing={drawing?.day === day[0].day ? drawing : null}
              onDraw={(blockId) => setDrawing(drawing?.day === day[0].day && drawing.blockId === blockId ? null : { day: day[0].day, blockId })}
              onPlace={(item, blockId) => run(placeNow(item.id, { weekStart, day: day[0].day, blockId }))}
              onUnplace={(entry) => run(unplace(entry))}
            />
          ))}
        </div>
      )}

      <footer className="flex flex-col gap-6 border-t border-rule-soft pt-5">
        <p className="m-0 text-[13px] text-ink-3">
          余白、およそ{Math.round(slack * 10)}割。{slack < LOW_SLACK && '少しだけ、詰まりぎみ。'}
        </p>
        <QuoteLine scene="week" date={weekStart} />
      </footer>
    </section>
  )
}

function Day({
  cells,
  entries,
  candidates,
  drawing,
  onDraw,
  onPlace,
  onUnplace,
}: {
  cells: Cell[]
  entries: WeekEntry[]
  candidates: Item[]
  drawing: { blockId: string | null } | null
  onDraw: (blockId: string | null) => void
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
      <div className={`w-11 shrink-0 font-mincho ${isPast ? 'text-ink-4' : isToday ? 'text-ink' : 'text-ink-2'}`}>
        <div className="text-xl">{Number(first.date.slice(8))}</div>
        <div className="text-xs">{WEEKDAYS[first.day]}</div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pt-1 text-[15px] leading-relaxed">
        {entries.length === 0 && <span className="font-mincho text-sm tracking-[0.2em] text-ink-4">余白の一日</span>}
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
                  {e.result && <span className="text-ink-4"> · {RESULT_LABEL[e.result]}</span>}
                </span>
                {cell.time !== 'past' && !e.result && (
                  <button type="button" onClick={() => onUnplace(e)} className="min-h-11 shrink-0 font-hand text-sm text-ink-4">
                    外す
                  </button>
                )}
              </div>
            )),
        )}
        {openBlocks.length > 0 && (
          <button type="button" onClick={() => onDraw(null)} className="min-h-11 self-start font-hand text-sm text-ink-3">
            {drawing ? '閉じる' : '描く'}
          </button>
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
                {candidates
                  .filter((c) => !entries.some((e) => e.blockId === pickBlock.block.id && e.item.id === c.id))
                  .map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => onPlace(item, pickBlock.block.id)} className="min-h-11 text-left text-[15px] text-ink-2">
                        {item.body}
                      </button>
                    </li>
                  ))}
                {candidates.length === 0 && <li className="text-sm text-ink-3">置けるものは、いまはない。</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
