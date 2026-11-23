import { useState } from 'react'
import { listGoogleLists, readLinks, saveLink, syncNow, type GoogleList, type ListLink } from '../data/sync'
import { AREAS, type Area } from '../domain/areas'

// Google ToDo との同期の設定(spec R29〜R31)。ふだんは折りたたんでおく
export default function SyncSettings({ onSynced }: { onSynced: () => void }) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<GoogleList[]>([])
  const [links, setLinks] = useState<ListLink[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [listsRes, linksRes] = await Promise.all([listGoogleLists(), readLinks()])
    if (!listsRes.ok) return setMessage(listsRes.message)
    if (!linksRes.ok) return setMessage(linksRes.message)
    setLists(listsRes.data)
    setLinks(linksRes.data)
    setMessage(null)
  }

  async function toggle() {
    if (!open) await load()
    setOpen(!open)
  }

  async function update(listId: string, link: Omit<ListLink, 'listId'> | null) {
    const res = await saveLink(listId, link)
    if (!res.ok) return setMessage(res.message)
    await load()
  }

  async function sync() {
    setBusy(true)
    const res = await syncNow()
    setBusy(false)
    if (!res.ok) return setMessage(res.message)
    if (res.data.busy) return setMessage('ほかの画面で同期しているところでした。少し時間をおくと、また同期できます。')
    setMessage(res.data.failed > 0 ? `同期しました。うまく反映できなかったものが ${res.data.failed} 件あります。` : `同期しました(${res.data.applied} 件の変更)。`)
    onSynced()
  }

  return (
    <section className="text-sm">
      <button className="text-stone-500" onClick={toggle}>
        Google ToDo との同期{open ? ' ▲' : ' ▼'}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {lists.map((list) => {
            const link = links.find((l) => l.listId === list.id)
            return (
              <div key={list.id} className="space-y-1 rounded border border-stone-200 bg-white p-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(link)}
                    // 最初にチェックしたリストは、自動で既定のリストにする
                    onChange={(e) => update(list.id, e.target.checked ? { area: null, isDefault: links.length === 0 } : null)}
                  />
                  {list.title}
                </label>
                {link && (
                  <div className="flex flex-wrap items-center gap-3 pl-6 text-stone-600">
                    <select
                      value={link.area ?? ''}
                      onChange={(e) => update(list.id, { ...link, area: (e.target.value || null) as Area | null })}
                      className="rounded border border-stone-300 bg-white px-2 py-1"
                    >
                      <option value="">領域なし</option>
                      {AREAS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={link.isDefault || (!links.some((l) => l.isDefault) && links[0]?.listId === list.id)}
                        onChange={() => update(list.id, { ...link, isDefault: true })}
                      />
                      既定のリスト
                    </label>
                  </div>
                )}
              </div>
            )
          })}
          <p className="text-stone-400">
            アプリで放り込んだ項目は、既定のリストに入ります(領域に結びついたリストがあれば、そちらに入ります)。
          </p>
          <button disabled={busy} className="rounded border border-stone-300 px-3 py-1 disabled:opacity-50" onClick={sync}>
            今すぐ同期
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-stone-500">{message}</p>}
    </section>
  )
}
