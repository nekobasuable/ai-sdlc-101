import { failure, toResult, type DataResult } from './result'
import { supabase } from './supabase'

const NOT_CONFIGURED = { ok: false, message: 'Supabase の設定がまだありません。' } as const

/** 一日の一言(R17a)。期間の一言を、日付 → 一言 の対応で返す */
export async function listDailyNotes(from: string, to: string): Promise<DataResult<Map<string, string>>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase.from('daily_notes').select('date, note').gte('date', from).lte('date', to)
  if (error) return failure(error)
  return { ok: true, data: new Map(data.map((r) => [r.date, r.note])) }
}

/** 一日の一言を残す。空にしたら消す */
export async function saveDailyNote(date: string, note: string): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const text = note.trim()
  const { error } = text
    ? await supabase.from('daily_notes').upsert({ date, note: text }, { onConflict: 'user_id,date' })
    : await supabase.from('daily_notes').delete().eq('date', date)
  return toResult(null, error)
}

/** 週のメモ(R17) */
export async function getWeeklyMemo(weekStart: string): Promise<DataResult<string>> {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase.from('weekly_reviews').select('memo').eq('week_start', weekStart).maybeSingle()
  if (error) return failure(error)
  return { ok: true, data: data?.memo ?? '' }
}

export async function saveWeeklyMemo(weekStart: string, memo: string): Promise<DataResult<null>> {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.from('weekly_reviews').upsert({ week_start: weekStart, memo }, { onConflict: 'user_id,week_start' })
  return toResult(null, error)
}
