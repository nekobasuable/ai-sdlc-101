import { FunctionsHttpError } from '@supabase/supabase-js'
import type { Area } from '../domain/areas'
import { failure, toResult, type DataResult } from './result'
import { supabase } from './supabase'

export type GoogleList = { id: string; title: string }
export type ListLink = { listId: string; area: Area | null; isDefault: boolean }
export type SyncSummary = { applied: number; failed: number }

/** Google とのつながりが切れていて、ログインし直す必要がある */
export const RECONNECT = 'Google とのつながりが切れています。ログアウトして、もう一度ログインすると戻ります。'

async function callGoogleTasks<T>(action: 'lists' | 'sync'): Promise<DataResult<T>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const { data, error } = await supabase.functions.invoke('google-tasks', { body: { action } })
  if (error) {
    if (error instanceof FunctionsHttpError && error.context.status === 409) return { ok: false, message: RECONNECT }
    return { ok: false, message: 'Google ToDo とうまくやり取りできませんでした。少し時間をおいて試してください。' }
  }
  return { ok: true, data: data as T }
}

export async function listGoogleLists(): Promise<DataResult<GoogleList[]>> {
  const res = await callGoogleTasks<{ lists: GoogleList[] }>('lists')
  return res.ok ? { ok: true, data: res.data.lists } : res
}

export const syncNow = () => callGoogleTasks<SyncSummary>('sync')

export async function readLinks(): Promise<DataResult<ListLink[]>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const { data, error } = await supabase.from('task_list_links').select('google_list_id, area, is_default')
  if (error) return failure(error)
  return { ok: true, data: data.map((l) => ({ listId: l.google_list_id, area: l.area as Area | null, isDefault: l.is_default })) }
}

/** リストの結びつきを保存する。link が null なら、同期の対象から外す */
export async function saveLink(listId: string, link: Omit<ListLink, 'listId'> | null): Promise<DataResult<null>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  if (!link) {
    const { error } = await supabase.from('task_list_links').delete().eq('google_list_id', listId)
    return toResult(null, error)
  }
  // 既定のリストは1つだけ
  if (link.isDefault) {
    const cleared = await supabase.from('task_list_links').update({ is_default: false }).neq('google_list_id', listId)
    if (cleared.error) return failure(cleared.error)
  }
  const { error } = await supabase
    .from('task_list_links')
    .upsert({ google_list_id: listId, area: link.area, is_default: link.isDefault }, { onConflict: 'user_id,google_list_id' })
  return toResult(null, error)
}
