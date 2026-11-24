import type { Reflection } from '../../supabase/functions/_shared/reflect.ts'
import type { DataResult } from './result'
import { supabase } from './supabase'

export type { Reflection }

const UNAVAILABLE = 'いまは整えられなかった。話したことは、そのまま残せる。'

/** 話した文章から、AI に下書きを作ってもらう(spec R40)。保存はしない */
export async function draftReflection(text: string): Promise<DataResult<Reflection>> {
  if (!supabase) return { ok: false, message: 'Supabase の設定がまだありません。' }
  const { data, error } = await supabase.functions.invoke('reflect', { body: { text } })
  if (error) return { ok: false, message: UNAVAILABLE }
  const body = data as { reflection?: Reflection; message?: string }
  return body.reflection ? { ok: true, data: body.reflection } : { ok: false, message: body.message ?? UNAVAILABLE }
}
