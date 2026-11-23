import { useEffect, useState } from 'react'
import { listCandidates, listWeek, placeNow, unplace, type Item, type WeekEntry } from '../data/items'
import type { AppSettings } from '../data/settings'
import { addDays, weekStartOf } from '../domain/slot'
import { cellKey, LOW_SLACK, slackRatio, weekGrid, type Cell } from '../domain/week-grid'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const RESULT_LABEL: Record<string, string> = { done: 'やった', partial: '一部', not_done: 'やらなかった' }

// 週の画面(R8、R10、R11、R13a)。1週間は「今」の積み重ねとして見せる(P7)
export default function WeekView({ settings, now, onChanged }: { settings: AppSettings; now: Date; onChanged: () => void }) {
  const [offset, setOffset] = useState(0) // 0 = 今週、1 = 来週
  const [entries, setEntries] = useState<WeekEntry[]>([])
  const [candidates, setCandidates] = useState<Item[]>([])
  const [picking, setPicking] = useState<string | null>(null)
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
      setEntries(week.data)
      setCandidates(cands.data)
    })
    return () => {
      active = false
    }
  }, [weekStart, version])

  const reload = () => {
    setVersion((v) => v + 1)
    onChanged()
  }

  async function run(action: Promise<{ ok: boolean; message?: string }>) {
    const res = await action
    if (!res.ok) return setMessage(res.message ?? null)
    setMessage(null)
    setPicking(null)
    reload()
  }

  const filled = new Set(entries.map((e) => cellKey(e.day, e.blockId)))
  const lowSlack = slackRatio(grid, filled) < LOW_SLACK

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">{offset === 0 ? '今週' : '来週'}</h1>
        <div className="flex gap-3 text-sm text-stone-500">
          <button className={offset === 0 ? 'text-stone-800' : ''} onClick={() => setOffset(0)}>
            今週
          </button>
          <button className={offset === 1 ? 'text-stone-800' : ''} onClick={() => setOffset(1)}>
            来週
          </button>
        </div>
      </div>
      {lowSlack && <p className="text-sm text-stone-500">{offset === 0 ? '今週' : '来週'}は余白が少なめです。</p>}
      {message && <p className="text-sm text-stone-500">{message}</p>}

      {grid.map((day) => (
        <div key={day[0].date} className="space-y-1">
          <h2 className="text-sm text-stone-500">
            {Number(day[0].date.slice(5, 7))}/{Number(day[0].date.slice(8))}({WEEKDAYS[day[0].day]})
          </h2>
          {day.map((cell) => (
            <BlockRow
              key={cell.block.id}
              cell={cell}
              entries={entries.filter((e) => e.day === cell.day && e.blockId === cell.block.id)}
              candidates={candidates}
              picking={picking === cellKey(cell.day, cell.block.id)}
              onPick={() => setPicking(picking === cellKey(cell.day, cell.block.id) ? null : cellKey(cell.day, cell.block.id))}
              onPlace={(item) => run(placeNow(item.id, { weekStart, day: cell.day, blockId: cell.block.id }))}
              onUnplace={(entry) => run(unplace(entry))}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

function BlockRow({
  cell,
  entries,
  candidates,
  picking,
  onPick,
  onPlace,
  onUnplace,
}: {
  cell: Cell
  entries: WeekEntry[]
  candidates: Item[]
  picking: boolean
  onPick: () => void
  onPlace: (item: Item) => void
  onUnplace: (entry: WeekEntry) => void
}) {
  const editable = cell.time !== 'past'
  const frame =
    cell.time === 'now' ? 'border-stone-700 bg-white' : cell.time === 'past' ? 'border-stone-200 bg-stone-100' : 'border-dashed border-stone-300'
  return (
    <div className={`rounded border px-3 py-2 ${frame}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 shrink-0 text-xs text-stone-400">{cell.block.label}</span>
        <div className="flex-1 space-y-1">
          {entries.length === 0 && <span className="text-sm text-stone-300">余白</span>}
          {entries.map((e) => (
            <div key={e.placementId} className={`flex items-center justify-between gap-2 text-sm ${cell.time === 'future' ? 'text-stone-500' : 'text-stone-800'}`}>
              <span>
                {e.item.body}
                {e.result && <span className="ml-2 text-xs text-stone-400">{RESULT_LABEL[e.result]}</span>}
              </span>
              {editable && !e.result && (
                <button className="shrink-0 text-xs text-stone-400" onClick={() => onUnplace(e)}>
                  外す
                </button>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <button className="shrink-0 text-xs text-stone-400" onClick={onPick}>
            {picking ? '閉じる' : '置く'}
          </button>
        )}
      </div>
      {picking && (
        <ul className="mt-2 space-y-1 border-t border-stone-200 pt-2">
          {candidates.length === 0 && <li className="text-sm text-stone-400">置ける項目はありません</li>}
          {candidates.map((item) => (
            <li key={item.id}>
              <button className="text-left text-sm text-stone-700" onClick={() => onPlace(item)}>
                {item.body}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
