import { useEffect, useState } from 'react'
import { fetchEvents, type CalendarResult } from '../data/calendar'
import { readSpikeRecord, signInWithGoogle, signOut, supabase, watchSignIn, type SpikeRecord } from '../data/supabase'
import { currentBlock } from '../domain/blocks'
import { weekRange } from '../domain/week'

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

// 試作の画面(plan/002)。本番の画面ではない
export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [record, setRecord] = useState<SpikeRecord | null>(() => readSpikeRecord())
  const [result, setResult] = useState<CalendarResult | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => watchSignIn(setRecord), [])

  const block = currentBlock(now, timeZone)

  async function loadCalendar() {
    if (!record?.providerToken) return
    const { start, end } = weekRange(new Date(), timeZone)
    setResult(await fetchEvents(record.providerToken, start, end))
    setCheckedAt(new Date())
  }

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-10 text-stone-800">
      <section>
        <p className="text-sm text-stone-500">今</p>
        <h1 className="text-3xl">{block ? `${block.label}の時間です` : '静かな時間です'}</h1>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-stone-500">試作: Google ログインとカレンダー</h2>
        {!supabase ? (
          <p>Supabase の設定(環境変数)がまだありません。</p>
        ) : !record ? (
          <button className="rounded border border-stone-300 px-4 py-2" onClick={signInWithGoogle}>
            Google でログイン
          </button>
        ) : (
          <>
            <div className="flex gap-2">
              <button className="rounded border border-stone-300 px-4 py-2" onClick={loadCalendar}>
                今週の予定を読む
              </button>
              <button className="rounded px-4 py-2 text-stone-500" onClick={signOut}>
                ログアウト
              </button>
            </div>
            {result?.kind === 'ok' && (
              <ul className="space-y-1">
                {result.events.length === 0 && <li className="text-stone-500">今週の予定はありません</li>}
                {result.events.map((e) => (
                  <li key={e.id}>
                    <span className="text-stone-500">{fmt(e.start)}</span> {e.title}
                  </li>
                ))}
              </ul>
            )}
            {result?.kind === 'expired' && <p>カレンダーを読むための鍵が切れています。</p>}
            {result?.kind === 'error' && <p>カレンダーを読めませんでした(コード {result.status})。</p>}
          </>
        )}
      </section>

      {record && (
        <section className="rounded bg-stone-100 p-3 text-sm">
          <h2 className="mb-1 text-stone-500">診断情報(結果の記録用)</h2>
          <p>ログインした時刻: {fmt(record.signedInAt)}</p>
          <p>カレンダー用の鍵: {record.providerToken ? '受け取った' : '受け取れなかった'}</p>
          <p>長期の鍵: {record.gotRefreshToken ? '受け取った' : '受け取れなかった'}</p>
          <p>
            最後にカレンダーを読んだ時刻: {checkedAt ? fmt(checkedAt.toISOString()) : 'まだ'}
            {result && `(結果: ${result.kind === 'ok' ? '読めた' : result.kind === 'expired' ? '鍵切れ' : 'エラー'})`}
          </p>
        </section>
      )}
    </main>
  )
}
