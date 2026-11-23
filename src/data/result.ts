/** データ層の結果。画面はこれを見て、データか、利用者に見せる文言かを受け取る */
export type DataResult<T> = { ok: true; data: T } | { ok: false; message: string }

type SupabaseError = { code?: string; message: string }

export function toResult<T>(data: T | null, error: SupabaseError | null): DataResult<T> {
  if (error) return failure(error)
  return { ok: true, data: data as T }
}

/** 失敗だけを返す(どの型の DataResult にも代入できる) */
export function failure(error: SupabaseError): { ok: false; message: string } {
  return { ok: false, message: describe(error) }
}

function describe(error: SupabaseError): string {
  // テーブルがまだ作られていない(クラウドにマイグレーションを適用していない)
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return 'データの準備ができていません。Supabase の SQL Editor でテーブルを作成してください。'
  }
  return `うまく保存や読み込みができませんでした(${error.message})`
}
