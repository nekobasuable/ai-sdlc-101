import { useCallback, useEffect, useState } from 'react'
import { listInbox, listNow, placeNow, setResult, unplace, type Item, type NowEntry, type PlacementResult } from '../data/items'
import { ensureSettings, type AppSettings } from '../data/settings'
import { signOut, supabase } from '../data/supabase'
import { currentBlock } from '../domain/blocks'
import { currentSlot } from '../domain/slot'
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

  const refresh = useCallback(async () => {
    const inboxRes = await listInbox()
    if (!inboxRes.ok) return setMessage(inboxRes.message)
    setInbox(inboxRes.data)
    if (!slot) return setEntries([])
    const nowRes = await listNow(slot)
    if (!nowRes.ok) return setMessage(nowRes.message)
    setEntries(nowRes.data)
    // slotKey が変わったとき(ブロックが切り替わったとき)だけ作り直す
  }, [slotKey])

  useEffect(() => {
    if (settings) void refresh()
  }, [settings, refresh])

  async function run(action: Promise<{ ok: boolean; message?: string }>) {
    const res = await action
    if (!res.ok) return setMessage(res.message ?? null)
    setMessage(null)
    await refresh()
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
      <Capture onAdded={() => void refresh()} onError={setMessage} />
    </main>
  )
}
