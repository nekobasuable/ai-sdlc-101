import { useEffect, useRef, useState } from 'react'
import { classifyItem, completeItem, listDue, listInbox, listNow, listWeek, placeNow, setResult, unplace, type Item, type NowEntry, type WeekEntry } from '../data/items'
import { ensureSettings, type AppSettings } from '../data/settings'
import { signInWithGoogle, signOut, supabase } from '../data/supabase'
import { suggestClassifications } from '../data/classify'
import { RECONNECT } from '../data/sync'
import { fetchEvents } from '../data/calendar'
import { currentBlock } from '../domain/blocks'
import { placeEvents, type PlacedEvent } from '../domain/calendar-blocks'
import { dueByToday } from '../domain/due'
import { owlFor } from '../domain/owl'
import { joinLabels, restOfDay } from '../domain/rest-of-day'
import { currentSlot, weekStartOf, type Slot } from '../domain/slot'
import { zonedParts } from '../domain/time'
import { weekRange } from '../domain/week'
import Capture from './Capture'
import InboxList from './InboxList'
import type { Classify } from './ItemMeta'
import NowView from './NowView'
import MonthView from './MonthView'
import Owl, { type OwlMood } from './Owl'
import Reveal from './Reveal'
import Sky from './Sky'
import { useScroll } from './useScroll'
import { newlyFinished, resultsOf } from '../domain/finished'
import { PAPER, periodOf } from '../domain/period'
import DailyNote from './DailyNote'
import QuoteLine from './QuoteLine'
import ReviewView from './ReviewView'
import TodayDue from './TodayDue'
import SignIn from './SignIn'
import { useAutoSync } from './useAutoSync'
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

type Tab = 'now' | 'week' | 'month' | 'review'
const TABS: readonly [Tab, string][] = [
  ['now', '今'],
  ['week', '週'],
  ['month', '月'],
  ['review', '省みる'],
]
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')

function Home() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [entries, setEntries] = useState<NowEntry[]>([])
  const [today, setToday] = useState<WeekEntry[]>([])
  const [events, setEvents] = useState<PlacedEvent[]>([])
  const [inbox, setInbox] = useState<Item[]>([])
  const [due, setDue] = useState<Item[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('now')
  // 話して省みる間のふくろうの様子(plan/013)。ふくろうは上のバーにいるので、ここで持つ(plan/021)
  const [owlMood, setOwlMood] = useState<OwlMood>(null)
  const scroll = useScroll()
  // 放り込んだ文字が「週」に着いた回数(着くたびに点を灯し直す)
  const [landed, setLanded] = useState(0)
  // 今のブロックで、まだ終えていなかったものを終えた回数。ふくろうはこの値が増えたときだけ跳ねる(plan/013)。
  // 開いたときの読み込みや、ブロックの切り替えで終えた数が変わっても跳ねないよう、同じ配置の結果の変化だけを数える(PR #17 のレビューの指摘)
  const [owlNudge, setOwlNudge] = useState(0)
  const lastResults = useRef<Map<string, string | null>>(new Map())
  useEffect(() => {
    const finished = newlyFinished(lastResults.current, entries)
    lastResults.current = resultsOf(entries)
    if (finished) setOwlNudge((n) => n + 1)
  }, [entries])
  // 項目の変更や、ブロックの切り替わり(slotKey の変化)のたびに読み直す
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    ensureSettings().then((res) => (res.ok ? setSettings(res.data) : setMessage(res.message)))
  }, [])
  const reload = () => setVersion((v) => v + 1)
  // 操作なしで Google ToDo と同期し、そのたびにカレンダーも読み直す(spec 変更 3)。失敗しても画面は使える
  const syncNotice = useAutoSync(reload)
  const tz = settings?.timeZone ?? 'Asia/Tokyo'
  const slot = settings ? currentSlot(now, tz, settings.blocks) : null
  const block = settings ? currentBlock(now, tz, settings.blocks) : null
  const slotKey = slot ? `${slot.weekStart}/${slot.day}/${slot.blockId}` : 'none'
  const p = zonedParts(now, tz)
  const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  const dayIndex = (p.weekday + 6) % 7
  // 時間帯の空と紙の色(spec R44、plan/013)。紙の色はページ全体の変数を差し替え、CSS の移り変わりで 2〜3秒かけて変わる
  const period = periodOf(now, tz)
  useEffect(() => {
    document.documentElement.style.setProperty('--color-paper', PAPER[period])
  }, [period])

  useEffect(() => {
    if (!settings) return
    let active = true
    const at = new Date()
    const weekStart = weekStartOf(at, settings.timeZone)
    const tp = zonedParts(at, settings.timeZone)
    const todayDate = `${tp.year}-${pad(tp.month)}-${pad(tp.day)}`
    void loadHome(currentSlot(at, settings.timeZone, settings.blocks), weekStart, todayDate).then((res) => {
      if (!active) return
      if ('message' in res) return setMessage(res.message)
      setInbox(res.inbox)
      setDue(res.due)
      setEntries(res.entries)
      setToday(res.week)
    })
    // カレンダーは読めなくても画面は使えるので、失敗は黙って前の予定のままにする
    const { start, end } = weekRange(at, settings.timeZone)
    void fetchEvents(start, end).then((res) => {
      if (active && res.ok) setEvents(placeEvents(res.data, weekStart, settings.timeZone, settings.blocks))
    })
    return () => {
      active = false
    }
  }, [settings, slotKey, version, date])

  const classify: Classify = (item, meta) => run(classifyItem(item.id, meta))

  /** 保存して読み直す。成否を返す(「終えた」の墨のしぶきは、保存できてから散らす) */
  async function run(action: Promise<{ ok: boolean; message?: string }>): Promise<boolean> {
    const res = await action
    if (!res.ok) {
      setMessage(res.message ?? null)
      return false
    }
    setMessage(null)
    reload()
    return true
  }

  if (!settings) return <p className="p-6 text-ink-3">{message ?? '開いています…'}</p>

  // 放り込む欄は、どのタブにも置く(spec R1。PR #3 のレビューの指摘)。スマホは画面の下に固定、PC は流れの中に置く
  const captureBar = (desktop: string) => (
    <div className={`fixed inset-x-0 bottom-0 bg-paper px-6 pb-[max(1rem,env(safe-area-inset-bottom))] ${desktop}`}>
      <Capture
        onAdded={() => {
          reload()
          // 放り込んだものに、AI の見立てを付けてもらう(plan/017)。付いたら読み直す
          void suggestClassifications().then((n) => n > 0 && reload())
        }}
        onError={setMessage}
        onLanded={() => setLanded((n) => n + 1)}
      />
    </div>
  )

  // 今日のこれから: 今のブロックより後の予定を文章に(スキル)
  const bodies = new Map<string, string[]>()
  for (const e of today) if (e.day === dayIndex && e.blockId !== block?.id) bodies.set(e.blockId, [...(bodies.get(e.blockId) ?? []), e.item.body])
  // カレンダーの予定も、今日のこれからに混ぜる(spec R9)
  const todayEvents = events.filter((e) => e.day === dayIndex)
  for (const e of todayEvents) if (e.blockId && e.blockId !== block?.id) bodies.set(e.blockId, [...(bodies.get(e.blockId) ?? []), `${e.title}(${e.time})`])
  const nowEvents = todayEvents.filter((e) => e.blockId !== null && e.blockId === block?.id).map((e) => `${e.title}(${e.time})`)
  const allDay = todayEvents.filter((e) => e.time === null).map((e) => e.title)
  const rest = restOfDay(settings.blocks, block?.id ?? null, bodies)
  const owl = owlFor(block, entries.length > 0)

  return (
    <div className="min-h-screen px-6 pt-7 pb-36 lg:px-18 lg:pt-9 lg:pb-12">
      {/* 日付、ふくろう、タブのバーは、スクロールしても、どのページでも上に残る(spec R36 改、R43、plan/021) */}
      <div
        className={`sticky top-0 z-40 -mx-6 -mt-7 bg-paper px-6 pt-3 transition-[border-color] duration-300 lg:-mx-18 lg:-mt-9 lg:px-18 lg:pt-4 ${scroll.scrolled ? 'border-b border-rule-soft' : 'border-b border-transparent'}`}
      >
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <span className="font-hand text-[15px] text-ink-3">
            <span className="hidden sm:inline">{p.month}月</span>
            {p.day}日({WEEKDAYS[p.weekday]})
          </span>
          <Owl pose={tab === 'review' && owlMood ? 'watch' : owl.pose} mood={tab === 'review' ? owlMood : null} nudge={owlNudge} small />
          <nav className="flex gap-4 text-sm tracking-[0.08em] sm:gap-5">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                {...(id === 'week' ? { 'data-fly-target': true } : {})}
                onClick={() => setTab(id)}
                className={`relative min-h-11 ${tab === id ? 'text-ink' : 'text-ink-3'}`}
              >
                {label}
                {/* 放り込んだ文字の行き先(plan/013)。着いたら小さな点を灯す */}
                {id === 'week' && landed > 0 && <span key={landed} aria-hidden="true" className="pulse-dot absolute top-2 -right-2 size-1 rounded-full bg-ink" />}
              </button>
            ))}
          </nav>
        </header>
      </div>

      {tab === 'review' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <ReviewView settings={settings} now={now} onOwlMood={setOwlMood} />
          {captureBar('lg:static lg:mt-12 lg:px-0 lg:pb-0')}
        </div>
      ) : tab === 'month' ? (
        <div className="mx-auto mt-10 max-w-6xl">
          <MonthView settings={settings} now={now} version={version} />
          <div className="mx-auto max-w-2xl">{captureBar('lg:static lg:mt-12 lg:px-0 lg:pb-0')}</div>
        </div>
      ) : tab === 'week' ? (
        <div className="mx-auto mt-10 max-w-2xl">
          <WeekView settings={settings} now={now} version={version} onChanged={reload} />
          {captureBar('lg:static lg:mt-12 lg:px-0 lg:pb-0')}
        </div>
      ) : (
        <div className="mx-auto mt-20 grid max-w-6xl gap-16 lg:mt-28 lg:grid-cols-[3fr_2fr] lg:gap-16">
          <main className="flex flex-col gap-16">
            <Sky key={period} period={period} />
            <NowView
              block={block}
              entries={entries}
              events={nowEvents}
              onResult={(entry, result) => run(setResult(entry, result))}
              onUnplace={(entry) => run(unplace(entry))}
              onClassify={classify}
            />
            <Reveal>
              <TodayDue {...dueByToday(due, date)} onComplete={(item) => run(completeItem(item.id))} onClassify={classify} />
            </Reveal>
            {message && <p className="m-0 text-sm text-ink-3">{message}</p>}
            <Reveal className="relative hidden lg:block">
              <QuoteLine screen="now" now={now} timeZone={tz} />
            </Reveal>
          </main>

          <aside className="flex flex-col gap-12 lg:border-l lg:border-rule-soft lg:pl-12">
            <section className="relative">
              <p className="m-0 mb-4 label">今日のこれから</p>
              <div className="flex flex-col gap-3 text-base leading-relaxed text-ink">
                {rest.planned.map((r) => (
                  <span key={r.label}>
                    {r.label}には、{r.bodies.join('、')}。
                  </span>
                ))}
                {rest.free.length > 0 && <span className="text-ink-3">{joinLabels(rest.free)}は、まだ何も決めていない。</span>}
                {rest.planned.length === 0 && rest.free.length === 0 && <span className="text-ink-3">今日は、これでおしまい。</span>}
                {allDay.length > 0 && <span className="text-ink-3">今日は一日、{allDay.join('、')}。</span>}
              </div>
            </section>

            <Reveal>
              <DailyNote date={date} />
            </Reveal>

            <Reveal>
              <InboxList items={inbox} canPlace={slot !== null} onPlace={(item) => slot && run(placeNow(item.id, slot))} onClassify={classify} />
            </Reveal>

            <Reveal className="relative lg:hidden">
              <QuoteLine screen="now" now={now} timeZone={tz} />
            </Reveal>

            {captureBar('lg:static lg:px-0 lg:pb-0')}
          </aside>
        </div>
      )}

      <footer className="mx-auto mt-24 flex max-w-6xl flex-col gap-6">
        {syncNotice && (
          <p className="m-0 text-sm text-ink-3">
            {syncNotice}
            {syncNotice === RECONNECT && (
              <button type="button" onClick={() => void signInWithGoogle({ consent: true })} className="ml-3 min-h-11 font-hand text-[15px] text-ink underline decoration-rule underline-offset-[6px]">
                つなぎ直す
              </button>
            )}
          </p>
        )}
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
  today: string,
): Promise<{ inbox: Item[]; entries: NowEntry[]; week: WeekEntry[]; due: Item[] } | { message: string }> {
  const [inbox, week, due] = await Promise.all([listInbox(), listWeek(weekStart), listDue({ to: today })])
  if (!inbox.ok) return { message: inbox.message }
  if (!week.ok) return { message: week.message }
  if (!due.ok) return { message: due.message }
  if (!slot) return { inbox: inbox.data, entries: [], week: week.data, due: due.data }
  const now = await listNow(slot)
  if (!now.ok) return { message: now.message }
  return { inbox: inbox.data, entries: now.data, week: week.data, due: due.data }
}
