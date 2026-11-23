import { useEffect, useState } from 'react'
import { listInbox, listNow, placeNow, setResult, unplace, type Item, type NowEntry, type PlacementResult } from '../data/items'
import { ensureSettings, type AppSettings } from '../data/settings'
import { signOut, supabase } from '../data/supabase'
import { currentBlock } from '../domain/blocks'
import { currentSlot, type Slot } from '../domain/slot'
import Capture from './Capture'
import InboxList from './InboxList'
import NowView from './NowView'
import SignIn from './SignIn'
import SpikePanel from './SpikePanel'

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <p className="p-4">Supabase の設定(環境変数)がまだありません。</p>
  if (signedIn === null) return null
  return signedIn ? <Home /> : <SignIn />
}

function Home() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [entries, setEntries] = useState<NowEntry[]>([])
  const [inbox, setInbox] = useState<Item[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    ensureSettings().then((res) => (res.ok ? setSettings(res.data) : setMessage(res.message)))
  }, [])

  const slot = settings ? currentSlot(now, settings.timeZone, settings.blocks) : null
  const block = settings ? currentBlock(now, settings.timeZone, settings.blocks) : null
  const slotKey = slot ? `${slot.weekStart}/${slot.day}/${slot.blockId}` : 'none'

  // 項目の変更や、ブロックの切り替わり(slotKey の変化)のたびに読み直す
  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    if (!settings) return
    let active = true
    void loadHome(currentSlot(new Date(), settings.timeZone, settings.blocks)).then((res) => {
      if (!active) return
      if ('message' in res) return setMessage(res.message)
      setInbox(res.inbox)
      setEntries(res.entries)
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

  if (!settings) return <p className="p-4 text-stone-500">{message ?? '読み込んでいます…'}</p>

  return (
    <main className="mx-auto max-w-md space-y-10 px-4 pt-10 pb-32 text-stone-800">
      <NowView
        block={block}
        entries={entries}
        onResult={(entry, result: PlacementResult) => run(setResult(entry, result))}
        onUnplace={(entry) => run(unplace(entry))}
      />
      {message && <p className="text-sm text-stone-500">{message}</p>}
      <InboxList items={inbox} canPlace={slot !== null} onPlace={(item) => slot && run(placeNow(item.id, slot))} />
      <SpikePanel timeZone={settings.timeZone} />
      <button className="text-sm text-stone-400" onClick={signOut}>
        ログアウト
      </button>
      <Capture onAdded={reload} onError={setMessage} />
    </main>
  )
}

/** Inbox と、今のブロックの項目を読む */
async function loadHome(slot: Slot | null): Promise<{ inbox: Item[]; entries: NowEntry[] } | { message: string }> {
  const inbox = await listInbox()
  if (!inbox.ok) return { message: inbox.message }
  if (!slot) return { inbox: inbox.data, entries: [] }
  const now = await listNow(slot)
  if (!now.ok) return { message: now.message }
  return { inbox: inbox.data, entries: now.data }
}
