import { FunctionsHttpError } from '@supabase/supabase-js'
import type { DataResult } from './result'
import { supabase } from './supabase'

export type SyncSummary = { applied: number; failed: number; busy?: boolean }

/** Google とのつながりが切れていて、ログインし直す必要がある */
export const RECONNECT = 'Google とのつながりが切れています。ログアウトして、もう一度開くと戻ります。'

async function callGoogleTasks<T>(action: 'sync'): Promise<DataResult<T>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const { data, error } = await supabase.functions.invoke('google-tasks', { body: { action } })
  if (error) {
    if (error instanceof FunctionsHttpError && error.context.status === 409) return { ok: false, message: RECONNECT }
    return { ok: false, message: 'Google ToDo とうまくやり取りできませんでした。少し時間をおくと、また同期します。' }
  }
  return { ok: true, data: data as T }
}

export const syncNow = () => callGoogleTasks<SyncSummary>('sync')
