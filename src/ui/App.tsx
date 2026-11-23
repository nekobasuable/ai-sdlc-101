import { useEffect, useState } from 'react'
import { listInbox, listNow, listWeek, placeNow, setResult, unplace, type Item, type NowEntry, type WeekEntry } from '../data/items'
import { ensureSettings, type AppSettings } from '../data/settings'
import { signOut, supabase } from '../data/supabase'
import { syncNow } from '../data/sync'
import { currentBlock } from '../domain/blocks'
import { owlFor } from '../domain/owl'
import { joinLabels, restOfDay } from '../domain/rest-of-day'
import { currentSlot, weekStartOf, type Slot } from '../domain/slot'
import { zonedParts } from '../domain/time'
import Capture from './Capture'
import InboxList from './InboxList'
import NowView from './NowView'
import Owl from './Owl'
import QuoteLine from './QuoteLine'
import SignIn from './SignIn'
import SpikePanel from './SpikePanel'
import SyncSettings from './SyncSettings'
import WeekView from './WeekView'

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <p className="p-6 text-ink-3">Supabase の設定(環境変数)がまだありません。</p>
  if (signedIn === null) return null
  return signedIn ? <Home /> : <SignIn />
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')

function Home() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [entries, setEntries] = useState<NowEntry[]>([])
  const [today, setToday] = useState<WeekEntry[]>([])
  const [inbox, setInbox] = useState<Item[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [tab, setTab] = useState<'now' | 'week'>('now')
  // 項目の変更や、ブロックの切り替わり(slotKey の変化)のたびに読み直す
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    ensureSettings().then((res) => (res.ok ? setSettings(res.data) : setMessage(res.message)))
  }, [])
  // アプリを開いたときに、Google ToDo と同期する(spec R34)。失敗しても画面は使える
  useEffect(() => {
    void syncNow().then((res) => res.ok && res.data.applied > 0 && setVersion((v) => v + 1))
  }, [])

  const reload = () => setVersion((v) => v + 1)
  const tz = settings?.timeZone ?? 'Asia/Tokyo'
  const slot = settings ? currentSlot(now, tz, settings.blocks) : null
  const block = settings ? currentBlock(now, tz, settings.blocks) : null
  const slotKey = slot ? `${slot.weekStart}/${slot.day}/${slot.blockId}` : 'none'
  const p = zonedParts(now, tz)
  const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  const dayIndex = (p.weekday + 6) % 7

  useEffect(() => {
    if (!settings) return
    let active = true
    void loadHome(currentSlot(new Date(), settings.timeZone, settings.blocks), weekStartOf(new Date(), settings.timeZone)).then((res) => {
      if (!active) return
      if ('message' in res) return setMessage(res.message)
      setInbox(res.inbox)
      setEntries(res.entries)
      setToday(res.week)
    })
    return () => {
      active = false
    }
  }, [settings, slotKey, version])

  async function run(action: Promise<{ ok: boolean; message?: string }>) {
    const res = await action
    if (!res.ok) return setMessage(res.message ?? null)
    setMessage(null)
    reload()
  }

  if (!settings) return <p className="p-6 text-ink-3">{message ?? '開いています…'}</p>

  // 放り込む欄は、どのタブにも置く(spec R1。PR #3 のレビューの指摘)。スマホは画面の下に固定、PC は流れの中に置く
  const captureBar = (desktop: string) => (
    <div className={`fixed inset-x-0 bottom-0 bg-paper px-6 pb-[max(1rem,env(safe-area-inset-bottom))] ${desktop}`}>
      <Capture onAdded={reload} onError={setMessage} />
    </div>
  )

  // 今日のこれから: 今のブロックより後の予定を文章に(スキル)
  const bodies = new Map<string, string[]>()
  for (const e of today) if (e.day === dayIndex && e.blockId !== block?.id) bodies.set(e.blockId, [...(bodies.get(e.blockId) ?? []), e.item.body])
  const rest = restOfDay(settings.blocks, block?.id ?? null, bodies)
  const owl = owlFor(block, entries.length > 0, date)
  const scene = !block || block.id === 'night' ? 'night' : 'day'

  return (
    <div className="min-h-screen px-6 pt-7 pb-36 lg:px-18 lg:pt-9 lg:pb-12">
      <header className="mx-auto flex max-w-6xl items-baseline justify-between">
        <span className="font-hand text-[15px] text-ink-3">
          {p.month}月{p.day}日({WEEKDAYS[p.weekday]})
        </span>
        <nav className="flex gap-5 text-sm tracking-[0.08em]">
          <button type="button" onClick={() => setTab('now')} className={`min-h-11 ${tab === 'now' ? 'text-ink' : 'text-ink-3'}`}>
            今
          </button>
          <button type="button" onClick={() => setTab('week')} className={`min-h-11 ${tab === 'week' ? 'text-ink' : 'text-ink-3'}`}>
            週
          </button>
        </nav>
      </header>

      {tab === 'week' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <WeekView settings={settings} now={now} onChanged={reload} />
          {captureBar('lg:static lg:mt-12 lg:px-0 lg:pb-0')}
        </div>
      ) : (
        <div className="mx-auto mt-20 grid max-w-6xl gap-16 lg:mt-28 lg:grid-cols-[7fr_4fr] lg:gap-24">
          <main className="flex flex-col gap-16">
            <NowView
              block={block}
              entries={entries}
              owl={owl.spot === 'heading' ? owl.pose : null}
              onResult={(entry, result) => run(setResult(entry, result))}
              onUnplace={(entry) => run(unplace(entry))}
            />
            {message && <p className="m-0 text-sm text-ink-3">{message}</p>}
            <div className="relative hidden lg:block">
              <QuoteLine scene={scene} date={date} />
              {owl.spot === 'corner' && <Owl pose={owl.pose} className="absolute -top-16 right-0" />}
            </div>
          </main>

          <aside className="flex flex-col gap-12 lg:border-l lg:border-rule-soft lg:pl-12">
            <section className="relative">
              <p className="m-0 mb-4 text-xs tracking-[0.18em] text-ink-3">今日のこれから</p>
              <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2">
                {rest.planned.map((r) => (
                  <span key={r.label}>
                    {r.label}には、{r.bodies.join('、')}。
                  </span>
                ))}
                {rest.free.length > 0 && <span className="text-ink-3">{joinLabels(rest.free)}は、まだ何も決めていない。</span>}
                {rest.planned.length === 0 && rest.free.length === 0 && <span className="text-ink-3">今日は、これでおしまい。</span>}
              </div>
              {owl.spot === 'aside' && <Owl pose={owl.pose} className="absolute -top-14 right-0" />}
            </section>

            <InboxList items={inbox} canPlace={slot !== null} onPlace={(item) => slot && run(placeNow(item.id, slot))} />

            <div className="relative lg:hidden">
              <QuoteLine scene={scene} date={date} />
              {owl.spot === 'corner' && <Owl pose={owl.pose} className="absolute -top-16 right-0" />}
            </div>

            {captureBar('lg:static lg:px-0 lg:pb-0')}
          </aside>
        </div>
      )}

      <footer className="mx-auto mt-24 flex max-w-6xl flex-col gap-6">
        <SyncSettings onSynced={reload} />
        <SpikePanel timeZone={tz} />
        <button type="button" onClick={signOut} className="min-h-11 self-start text-sm text-ink-3">
          ログアウト
        </button>
      </footer>
    </div>
  )
}

/** Inbox、今のブロックの項目、今週の配置を読む */
async function loadHome(
  slot: Slot | null,
  weekStart: string,
): Promise<{ inbox: Item[]; entries: NowEntry[]; week: WeekEntry[] } | { message: string }> {
  const [inbox, week] = await Promise.all([listInbox(), listWeek(weekStart)])
  if (!inbox.ok) return { message: inbox.message }
  if (!week.ok) return { message: week.message }
  if (!slot) return { inbox: inbox.data, entries: [], week: week.data }
  const now = await listNow(slot)
  if (!now.ok) return { message: now.message }
  return { inbox: inbox.data, entries: now.data, week: week.data }
}
