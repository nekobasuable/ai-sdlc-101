// plan/005 段階 C: Google ToDo との同期。
// 操作は2つ: { action: 'lists' } でリストの一覧、{ action: 'sync' } で同期の実行。
// 判断は _shared/sync.ts の planSync に任せ、ここは通信と適用だけを行う。
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { planSync, statusFromTask, type ListLink, type LocalItem, type RemoteTask, type SyncOp } from '../_shared/sync.ts'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

class ReconnectNeeded extends Error {}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) return json(req, 401, { error: 'not signed in' })
  const userId = userData.user.id

  const { action } = (await req.json().catch(() => ({}))) as { action?: string }
  try {
    const accessToken = await googleAccessToken(admin, userId)
    if (action === 'lists') return json(req, 200, { lists: await fetchLists(accessToken) })
    if (action === 'sync') return json(req, 200, await runSync(admin, userId, accessToken))
    return json(req, 400, { error: 'unknown action' })
  } catch (e) {
    if (e instanceof ReconnectNeeded) return json(req, 409, { reconnect: true })
    console.error('google-tasks の失敗', e instanceof Error ? e.message : String(e))
    return json(req, 500, { error: 'failed' })
  }
})

/** 保管してある長期の鍵で、短期の鍵を取る。鍵が使えなくなっていたら、つなぎ直しが必要 */
async function googleAccessToken(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin.from('google_credentials').select('encrypted_refresh_token, invalid_at').eq('user_id', userId).maybeSingle()
  if (!data || data.invalid_at) throw new ReconnectNeeded()
  const refreshToken = await decrypt(data.encrypted_refresh_token, Deno.env.get('GOOGLE_TOKEN_KEY')!)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    if (body.error === 'invalid_grant') {
      await admin.from('google_credentials').update({ invalid_at: new Date().toISOString() }).eq('user_id', userId)
      throw new ReconnectNeeded()
    }
    throw new Error(`token refresh failed: ${res.status} ${body.error ?? ''}`)
  }
  return body.access_token as string
}

async function google(accessToken: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${TASKS_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Google Tasks API ${init.method ?? 'GET'} ${path.split('?')[0]}: ${res.status}`)
  return res.status === 204 ? null : res.json()
}

async function fetchLists(accessToken: string): Promise<{ id: string; title: string }[]> {
  const body = await google(accessToken, '/users/@me/lists?maxResults=100')
  return (body.items ?? []).map((l: { id: string; title: string }) => ({ id: l.id, title: l.title }))
}

type GoogleTask = { id: string; title?: string; due?: string; status?: string; deleted?: boolean; updated: string }

const toRemote = (listId: string, t: GoogleTask): RemoteTask => ({
  id: t.id,
  listId,
  title: t.title ?? '',
  due: t.due ? t.due.slice(0, 10) : null,
  completed: t.status === 'completed',
  deleted: Boolean(t.deleted),
  updated: t.updated,
})

async function fetchTasks(accessToken: string, listId: string): Promise<RemoteTask[]> {
  const tasks: RemoteTask[] = []
  let pageToken = ''
  do {
    const query = new URLSearchParams({ maxResults: '100', showCompleted: 'true', showHidden: 'true', showDeleted: 'true' })
    if (pageToken) query.set('pageToken', pageToken)
    const body = await google(accessToken, `/lists/${encodeURIComponent(listId)}/tasks?${query}`)
    for (const t of body.items ?? []) tasks.push(toRemote(listId, t))
    pageToken = body.nextPageToken ?? ''
  } while (pageToken)
  return tasks
}

/** Google の締め切りは日付だけを UTC の0時で表す */
const toGoogle = (item: LocalItem) => ({
  title: item.body,
  due: item.dueDate ? `${item.dueDate}T00:00:00.000Z` : null,
  status: item.status === 'done' ? 'completed' : 'needsAction',
})

// synced_at に何か値を書くと、トリガーが updated_at と同じ時刻にそろえる(マイグレーション 20261124010000)
const SYNC_STAMP = new Date(0).toISOString()

async function runSync(admin: SupabaseClient, userId: string, accessToken: string) {
  const { data: linkRows } = await admin.from('task_list_links').select('google_list_id, area, is_default').eq('user_id', userId)
  const links: ListLink[] = (linkRows ?? []).map((l) => ({ listId: l.google_list_id, area: l.area, isDefault: l.is_default }))
  if (links.length === 0) return { applied: 0, failed: 0 }

  const { data: itemRows, error } = await admin
    .from('items')
    .select('id, body, area, due_date, status, google_task_id, google_list_id, google_updated_at, updated_at, synced_at, deleted_at')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  const items: LocalItem[] = (itemRows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    area: r.area,
    dueDate: r.due_date,
    status: r.status,
    googleTaskId: r.google_task_id,
    googleListId: r.google_list_id,
    googleUpdatedAt: r.google_updated_at,
    updatedAt: r.updated_at,
    syncedAt: r.synced_at,
    deletedAt: r.deleted_at,
  }))

  const tasks = (await Promise.all(links.map((l) => fetchTasks(accessToken, l.listId)))).flat()
  const ops = planSync(items, tasks, links)

  let applied = 0
  let failed = 0
  for (const op of ops) {
    try {
      await apply(admin, userId, accessToken, op)
      applied++
    } catch (e) {
      failed++
      console.error('同期の適用に失敗', op.kind, e instanceof Error ? e.message : String(e))
    }
  }
  return { applied, failed }
}

async function apply(admin: SupabaseClient, userId: string, accessToken: string, op: SyncOp) {
  const items = admin.from('items')
  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message)
  }
  switch (op.kind) {
    case 'createLocal':
      return check(
        await items.insert({
          user_id: userId,
          body: op.task.title,
          area: op.area,
          due_date: op.task.due,
          status: 'inbox',
          google_task_id: op.task.id,
          google_list_id: op.task.listId,
          google_updated_at: op.task.updated,
          synced_at: SYNC_STAMP,
        }),
      )
    case 'updateLocal':
      return check(
        await items
          .update({
            body: op.task.title,
            due_date: op.task.due,
            status: statusFromTask(op.task, op.item.status),
            google_updated_at: op.task.updated,
            synced_at: SYNC_STAMP,
          })
          .eq('id', op.item.id),
      )
    case 'deleteLocal':
      return check(await items.update({ deleted_at: new Date().toISOString(), synced_at: SYNC_STAMP }).eq('id', op.item.id))
    case 'createRemote': {
      const created = await google(accessToken, `/lists/${encodeURIComponent(op.listId)}/tasks`, {
        method: 'POST',
        body: JSON.stringify(toGoogle(op.item)),
      })
      return check(
        await items
          .update({ google_task_id: created.id, google_list_id: op.listId, google_updated_at: created.updated, synced_at: SYNC_STAMP })
          .eq('id', op.item.id),
      )
    }
    case 'updateRemote': {
      const updated = await google(accessToken, `/lists/${encodeURIComponent(op.listId)}/tasks/${encodeURIComponent(op.taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify(toGoogle(op.item)),
      })
      return check(await items.update({ google_updated_at: updated.updated, synced_at: SYNC_STAMP }).eq('id', op.item.id))
    }
    case 'deleteRemote':
      await google(accessToken, `/lists/${encodeURIComponent(op.listId)}/tasks/${encodeURIComponent(op.taskId)}`, { method: 'DELETE' })
      return check(await items.update({ synced_at: SYNC_STAMP }).eq('id', op.item.id))
  }
}
