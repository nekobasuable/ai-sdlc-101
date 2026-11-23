import { FunctionsHttpError } from '@supabase/supabase-js'
import type { CalendarEvent } from '../domain/calendar-blocks'
import type { DataResult } from './result'
import { supabase } from './supabase'
import { RECONNECT } from './sync'

/** 指定した範囲のカレンダーの予定を、サーバー側の関数で読む(spec R9、plan/009) */
export async function fetchEvents(start: Date, end: Date): Promise<DataResult<CalendarEvent[]>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const { data, error } = await supabase.functions.invoke('google-calendar', {
    body: { timeMin: start.toISOString(), timeMax: end.toISOString() },
  })
  if (error) {
    if (error instanceof FunctionsHttpError && error.context.status === 409) return { ok: false, message: RECONNECT }
    return { ok: false, message: 'カレンダーを読めませんでした。' }
  }
  return { ok: true, data: (data as { events: CalendarEvent[] }).events }
}
