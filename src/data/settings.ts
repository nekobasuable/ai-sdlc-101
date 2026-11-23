import { DEFAULT_BLOCKS, type Block } from '../domain/blocks'
import { failure, type DataResult } from './result'
import { supabase } from './supabase'

export type AppSettings = { timeZone: string; blocks: readonly Block[] }

/** 設定を読む。まだなければ、端末のタイムゾーンで作る */
export async function ensureSettings(): Promise<DataResult<AppSettings>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const found = await supabase.from('settings').select('time_zone, blocks').maybeSingle()
  if (found.error) return failure(found.error)
  let row = found.data
  if (!row) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const created = await supabase.from('settings').insert({ time_zone: timeZone }).select('time_zone, blocks').single()
    if (created.error) return failure(created.error)
    row = created.data
  }
  return {
    ok: true,
    data: { timeZone: row.time_zone, blocks: (row.blocks as Block[] | null) ?? DEFAULT_BLOCKS },
  }
}
