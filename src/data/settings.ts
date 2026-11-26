import { DEFAULT_BLOCKS, type Block } from '../domain/blocks'
import { normalizePillars, parsePillars, type Pillar } from '../domain/pillars'
import { failure, type DataResult } from './result'
import { supabase } from './supabase'

/** pillars: 人生の柱(plan/022) */
export type AppSettings = { timeZone: string; blocks: readonly Block[]; pillars: readonly Pillar[] }

/** 設定を読む。まだなければ、端末のタイムゾーンで作る */
export async function ensureSettings(): Promise<DataResult<AppSettings>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const found = await supabase.from('settings').select('time_zone, blocks, pillars').maybeSingle()
  if (found.error) return failure(found.error)
  let row = found.data
  if (!row) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const created = await supabase.from('settings').insert({ time_zone: timeZone }).select('time_zone, blocks, pillars').single()
    if (created.error) return failure(created.error)
    row = created.data
  }
  return {
    ok: true,
    data: { timeZone: row.time_zone, blocks: (row.blocks as Block[] | null) ?? DEFAULT_BLOCKS, pillars: parsePillars(row.pillars) },
  }
}

/** 人生の柱を残す(plan/022)。空の名前や重なった名前は除いて残し、残したものを返す */
export async function savePillars(pillars: readonly Pillar[]): Promise<DataResult<Pillar[]>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const clean = normalizePillars(pillars)
  // 本人の行だけが読み書きできる(RLS)。念のため本人の id でも絞る
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user.id
  if (!userId) return { ok: false, message: 'ログインしていません。' }
  const { error } = await supabase.from('settings').update({ pillars: clean }).eq('user_id', userId)
  return error ? failure(error) : { ok: true, data: clean }
}
