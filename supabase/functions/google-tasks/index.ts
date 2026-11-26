// Google ToDo との同期(plan/005、plan/009)。
// 操作は2つ: { action: 'sync' } で同期の実行(すべてのリストが対象。画面から操作なしで呼ばれる)、
// { action: 'lists' } でリストの一覧(今は画面から使っていない)。
// 判断は _shared/sync.ts の planSync に任せ、ここは通信と適用だけを行う。
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { googleAccessToken, ReconnectNeeded, signedInUser } from '../_shared/google-auth.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { linksFromLists, planSync, statusFromTask, toGoogle, type LocalItem, type RemoteTask, type StoredLink, type SyncOp } from '../_shared/sync.ts'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const userId = await signedInUser(admin, req)
  if (!userId) return json(req, 401, { error: 'not signed in' })

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

type GoogleTask = { id: string; title?: string; notes?: string; due?: string; status?: string; deleted?: boolean; updated: string }

const toRemote = (listId: string, t: GoogleTask): RemoteTask => ({
  id: t.id,
  listId,
  title: t.title ?? '',
  notes: t.notes ?? null,
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

// Google に送る内容は _shared/sync.ts の toGoogle(テスト付き)

// synced_at に何か値を書くと、トリガーが updated_at と同じ時刻にそろえる(マイグレーション 20261124010000)
const SYNC_STAMP = new Date(0).toISOString()

// 関数の最長の実行時間(数分)より十分長くする。短いと、動いている同期を「止まったもの」とみなして重ねてしまう(PR レビューの指摘)
const LEASE_MS = 10 * 60 * 1000

/**
 * 同期を同時に1つだけにする(PR レビューの指摘、spec C13)。
 * 「空か、期限より古い」ときだけ書き込める更新は、データベースの中で1つの操作として行われるので、
 * 同時に呼ばれても成功するのは1つだけになる。
 */
async function claimSyncLease(admin: SupabaseClient, userId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - LEASE_MS).toISOString()
  const { data, error } = await admin
    .from('google_credentials')
    .update({ sync_started_at: new Date().toISOString() })
    .eq('user_id', userId)
    .or(`sync_started_at.is.null,sync_started_at.lt.${staleBefore}`)
    .select('user_id')
  if (error) throw new Error(error.message)
  return (data ?? []).length === 1
}

async function releaseSyncLease(admin: SupabaseClient, userId: string) {
  await admin.from('google_credentials').update({ sync_started_at: null }).eq('user_id', userId)
}

async function runSync(admin: SupabaseClient, userId: string, accessToken: string) {
  if (!(await claimSyncLease(admin, userId))) return { applied: 0, failed: 0, busy: true }
  try {
    return await runSyncLocked(admin, userId, accessToken)
  } finally {
    await releaseSyncLease(admin, userId)
  }
}

async function runSyncLocked(admin: SupabaseClient, userId: string, accessToken: string) {
  // すべてのリストを同期する(spec 変更 3、R29)。保管された結びつきは、領域と既定の上書きにだけ使う
  const { data: linkRows } = await admin.from('task_list_links').select('google_list_id, area, is_default').eq('user_id', userId)
  const stored: StoredLink[] = (linkRows ?? []).map((l) => ({ listId: l.google_list_id, area: l.area, isDefault: l.is_default }))
  const links = linksFromLists(await fetchLists(accessToken), stored)
  if (links.length === 0) return { applied: 0, failed: 0 }

  const { data: itemRows, error } = await admin
    .from('items')
    .select('id, body, notes, area, due_date, status, google_task_id, google_list_id, google_updated_at, updated_at, synced_at, deleted_at')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  const items: LocalItem[] = (itemRows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    notes: r.notes,
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
          notes: op.task.notes,
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
            notes: op.task.notes,
            due_date: op.task.due,
            status: statusFromTask(op.task, op.item.status),
            google_updated_at: op.task.updated,
            synced_at: SYNC_STAMP,
          })
          .eq('id', op.item.id)
          // 読んだあとに利用者が変えていたら書かない。その変更は次の同期で扱う(PR レビューの指摘)
          .eq('updated_at', op.item.updatedAt),
      )
    case 'deleteLocal':
      return check(
        await items
          .update({ deleted_at: new Date().toISOString(), synced_at: SYNC_STAMP })
          .eq('id', op.item.id)
          .eq('updated_at', op.item.updatedAt),
      )
    case 'createRemote': {
      const taskPath = `/lists/${encodeURIComponent(op.listId)}/tasks`
      const created = await google(accessToken, taskPath, { method: 'POST', body: JSON.stringify(toGoogle(op.item)) })
      const recorded = await recordAfterRemote(admin, op.item, {
        google_task_id: created.id,
        google_list_id: op.listId,
        google_updated_at: created.updated,
      })
      if (recorded.error) {
        // 記録に失敗したら、作った Google 側のタスクを消して戻す(次の同期で二重に作らないため。PR レビューの指摘)
        await google(accessToken, `${taskPath}/${encodeURIComponent(created.id)}`, { method: 'DELETE' }).catch(() => {})
      }
      return check(recorded)
    }
    case 'updateRemote': {
      const updated = await google(accessToken, `/lists/${encodeURIComponent(op.listId)}/tasks/${encodeURIComponent(op.taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify(toGoogle(op.item)),
      })
      return check(await recordAfterRemote(admin, op.item, { google_updated_at: updated.updated }))
    }
    case 'deleteRemote':
      await google(accessToken, `/lists/${encodeURIComponent(op.listId)}/tasks/${encodeURIComponent(op.taskId)}`, { method: 'DELETE' })
      return check(await recordAfterRemote(admin, op.item, {}))
  }
}

/**
 * Google に送ったあとの記録(3回目の PR レビューの指摘)。
 * 読んだあとに利用者が項目を変えていなければ、Google 側の情報とあわせて「同期済み」にする。
 * 変えていたら、Google 側の情報だけを記録し、「同期済み」にはしない。その変更は次の同期で Google に送り直される。
 */
async function recordAfterRemote(admin: SupabaseClient, item: LocalItem, fields: Record<string, string>) {
  const synced = await admin
    .from('items')
    .update({ ...fields, synced_at: SYNC_STAMP })
    .eq('id', item.id)
    .eq('updated_at', item.updatedAt)
    .select('id')
  if (synced.error || (synced.data ?? []).length > 0 || Object.keys(fields).length === 0) return synced
  return admin.from('items').update(fields).eq('id', item.id)
}
