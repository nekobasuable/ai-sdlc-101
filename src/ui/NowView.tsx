import type { NowEntry, PlacementResult } from '../data/items'
import type { Block } from '../domain/blocks'
import type { OwlPose } from '../domain/owl'
import HandCircle from './HandCircle'
import Owl from './Owl'

// 今の画面(R13、R14、R14a)。今やることだけを大きく(P7)
export default function NowView({
  block,
  entries,
  owl,
  events,
  onResult,
  onUnplace,
}: {
  block: Block | null
  entries: NowEntry[]
  owl: OwlPose | null
  /** 今のブロックにあるカレンダーの予定(「講義(18:00)」の形) */
  events: string[]
  onResult: (entry: NowEntry, result: PlacementResult) => void
  onUnplace: (entry: NowEntry) => void
}) {
  if (!block) {
    return (
      <section className="relative">
        <h1 className="m-0 font-mincho text-[30px] leading-relaxed font-normal tracking-wide lg:text-[40px]">静かな時間。</h1>
        {owl && <Owl pose={owl} className="absolute -top-14 right-2" />}
      </section>
    )
  }
  const large = entries.length <= 1
  return (
    <section className="relative">
      <h1 className="m-0 text-xs font-normal tracking-[0.18em] text-ink-3">{block.label}のあいだ</h1>
      {owl && <Owl pose={owl} className="absolute -top-8 right-2" />}
      {events.length > 0 && <p className="m-0 mt-2 text-sm text-ink-3">この時間には、{events.join('、')}がある。</p>}
      {entries.length === 0 ? (
        <p className="mt-4 mb-0 font-mincho text-[30px] leading-relaxed font-normal tracking-wide lg:text-[40px]">
          何も決めていない、
          <br />
          余白の時間。
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {entries.map((entry) => (
            <div key={entry.placementId}>
              <div className="flex items-start gap-3">
                <HandCircle
                  checked={entry.result === 'done'}
                  label={entry.result === 'done' ? '終えた(押すと途中までに戻す)' : '終えた'}
                  onClick={() => onResult(entry, entry.result === 'done' ? 'partial' : 'done')}
                />
                <h2
                  className={`m-0 font-mincho leading-relaxed font-normal tracking-wide ${large ? 'text-[30px] lg:text-[44px]' : 'text-2xl lg:text-3xl'} ${entry.result === 'done' ? 'text-ink-3' : ''}`}
                >
                  {entry.item.body}
                </h2>
              </div>
              <div className="mt-3 ml-12 flex flex-wrap gap-x-5 font-hand text-[15px]">
                <button type="button" onClick={() => onResult(entry, 'partial')} className={`min-h-11 ${entry.result === 'partial' ? 'text-ink underline decoration-rule underline-offset-[6px]' : 'text-ink-3'}`}>
                  途中まで
                </button>
                <button type="button" onClick={() => onResult(entry, 'not_done')} className={`min-h-11 ${entry.result === 'not_done' ? 'text-ink underline decoration-rule underline-offset-[6px]' : 'text-ink-3'}`}>
                  今日は手放す
                </button>
                {!entry.result && (
                  <button type="button" onClick={() => onUnplace(entry)} className="min-h-11 text-ink-3">
                    ここから外す
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
