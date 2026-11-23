import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** 環境変数が未設定なら null(試作の画面で、その旨を表示する) */
export const supabase: SupabaseClient<Database> | null = url && key ? createClient<Database>(url, key) : null

// カレンダーの読み取りと、Google ToDo の読み書き(plan/005)
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ')

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_SCOPES,
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
      // Google の長期の鍵(provider refresh token)を受け取るため
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
  // plan/002 の試作で控えていた鍵が残っていれば消す
  localStorage.removeItem('spike-002')
}

/**
 * ログイン直後に Google から受け取った長期の鍵を、サーバーに送って暗号化して保管する(plan/005 段階 B、spec C12)。
 * モジュールの読み込み時に1回だけ登録する。画面の部品の中で登録すると、部品が表示される前に届いた知らせを取りこぼす。
 * 長期の鍵はブラウザに残さない。カレンダー用の短期の鍵も控えない(plan/009 でサーバー側で読むようにした)。
 */
let sentRefreshToken: string | null = null
supabase?.auth.onAuthStateChange((_event, session) => {
  const refreshToken = session?.provider_refresh_token
  if (refreshToken && refreshToken !== sentRefreshToken) {
    sentRefreshToken = refreshToken
    // onAuthStateChange の中で Supabase を待つと固まることがあるため、次の処理の順番に回す
    setTimeout(() => void supabase?.functions.invoke('google-token', { body: { refresh_token: refreshToken } }), 0)
  }
})
