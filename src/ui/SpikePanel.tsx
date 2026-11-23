import { useEffect, useState } from 'react'
import { fetchEvents, type CalendarResult } from '../data/calendar'
import { readSpikeRecord, watchSignIn, type SpikeRecord } from '../data/supabase'
import { weekRange } from '../domain/week'

const fmt = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

// plan/002 の試作の診断表示。plan/002 を閉じたら消す
export default function SpikePanel({ timeZone }: { timeZone: string }) {
  const [record, setRecord] = useState<SpikeRecord | null>(() => readSpikeRecord())
  const [result, setResult] = useState<CalendarResult | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  useEffect(() => watchSignIn(setRecord), [])

  async function loadCalendar() {
    if (!record?.providerToken) return
    const { start, end } = weekRange(new Date(), timeZone)
    setResult(await fetchEvents(record.providerToken, start, end))
    setCheckedAt(new Date())
  }

  if (!record) return null
  return (
    <details className="rounded bg-stone-100 p-3 text-sm text-stone-600">
      <summary>試作: カレンダーの診断(plan/002)</summary>
      <div className="mt-2 space-y-1">
        <button className="rounded border border-stone-300 px-3 py-1" onClick={loadCalendar}>
          今週の予定を読む
        </button>
        {result?.kind === 'ok' && (
          <ul>
            {result.events.length === 0 && <li>今週の予定はありません</li>}
            {result.events.map((e) => (
              <li key={e.id}>
                {fmt(e.start, timeZone)} {e.title}
              </li>
            ))}
          </ul>
        )}
        {result?.kind === 'expired' && <p>カレンダーを読むための鍵が切れています。</p>}
        {result?.kind === 'error' && <p>カレンダーを読めませんでした(コード {result.status})。</p>}
        <p>ログインした時刻: {fmt(record.signedInAt, timeZone)}</p>
        <p>カレンダー用の鍵: {record.providerToken ? '受け取った' : '受け取れなかった'}</p>
        <p>長期の鍵: {record.gotRefreshToken ? '受け取った' : '受け取れなかった'}</p>
        <p>
          最後にカレンダーを読んだ時刻: {checkedAt ? fmt(checkedAt.toISOString(), timeZone) : 'まだ'}
          {result && `(結果: ${result.kind === 'ok' ? '読めた' : result.kind === 'expired' ? '鍵切れ' : 'エラー'})`}
        </p>
      </div>
    </details>
  )
}
