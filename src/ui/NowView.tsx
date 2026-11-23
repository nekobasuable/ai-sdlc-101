import type { NowEntry, PlacementResult } from '../data/items'
import type { Block } from '../domain/blocks'

const RESULTS: { value: PlacementResult; label: string }[] = [
  { value: 'done', label: 'やった' },
  { value: 'partial', label: '一部' },
  { value: 'not_done', label: 'やらなかった' },
]

// 今の画面(R13)。今のブロックだけを大きく見せる(P7)
export default function NowView({
  block,
  entries,
  onResult,
  onUnplace,
}: {
  block: Block | null
  entries: NowEntry[]
  onResult: (entry: NowEntry, result: PlacementResult) => void
  onUnplace: (entry: NowEntry) => void
}) {
  if (!block) {
    return (
      <section>
        <p className="text-sm text-stone-500">今</p>
        <h1 className="text-3xl">静かな時間です</h1>
      </section>
    )
  }
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm text-stone-500">今</p>
        <h1 className="text-3xl">{block.label}の時間です</h1>
      </div>
      {entries.length === 0 ? (
        <p className="text-stone-500">今は余白の時間です。</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.placementId} className="space-y-2 rounded border border-stone-200 bg-white p-4">
              <p className="text-xl">{entry.item.body}</p>
              <div className="flex flex-wrap gap-2">
                {RESULTS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => onResult(entry, r.value)}
                    className={`rounded border px-3 py-1 text-sm ${
                      entry.result === r.value ? 'border-stone-700 bg-stone-700 text-white' : 'border-stone-300 text-stone-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
                <button onClick={() => onUnplace(entry)} className="px-3 py-1 text-sm text-stone-400">
                  外す
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
