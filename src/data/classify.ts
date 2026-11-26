import { supabase } from './supabase'

/**
 * まだ見立てのないやることに、AI の見立てを付けてもらう(plan/017、spec R24 改)。
 * 見立てを書いた件数を返す。失敗しても画面には何も出さない(見立ては無くても使えるため。次の同期でまた試す)
 */
export async function suggestClassifications(): Promise<number> {
  if (!supabase) return 0
  const { data, error } = await supabase.functions.invoke('classify', { body: {} })
  if (error) return 0
  return (data as { suggested?: number } | null)?.suggested ?? 0
}
