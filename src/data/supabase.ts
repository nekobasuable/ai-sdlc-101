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
      // Google の長期の鍵(provider refresh token)も受け取れるか確かめる(plan/002)
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
  localStorage.removeItem(SPIKE_KEY)
}

/**
 * 試作用の記録(plan/002)。Supabase は再読み込みやセッション更新で provider token を落とすことがあるため、
 * ログイン直後に受け取った provider token をここに控え、Google 側でいつ切れるかを測れるようにする。
 * provider refresh token は保存せず、受け取れたかどうかだけを記録する。
 */
export type SpikeRecord = {
  signedInAt: string
  providerToken: string | null
  gotRefreshToken: boolean
}

const SPIKE_KEY = 'spike-002'

/**
 * ログイン直後に Google から受け取った鍵を扱う。モジュールの読み込み時に1回だけ登録する。
 * 画面の部品の中で登録すると、部品が表示される前に届いたログインの知らせを取りこぼす(plan/005 で起きた)。
 */
let sentRefreshToken: string | null = null
supabase?.auth.onAuthStateChange((_event, session) => {
  // provider token は、Google から戻ってきた直後のセッションにだけ含まれる
  if (!session?.provider_token) return
  const record: SpikeRecord = {
    signedInAt: new Date().toISOString(),
    providerToken: session.provider_token,
    gotRefreshToken: Boolean(session.provider_refresh_token),
  }
  localStorage.setItem(SPIKE_KEY, JSON.stringify(record))
  // 長期の鍵はブラウザに残さず、サーバーに送って暗号化して保管する(plan/005 段階 B、spec C12)
  const refreshToken = session.provider_refresh_token
  if (refreshToken && refreshToken !== sentRefreshToken) {
    sentRefreshToken = refreshToken
    // onAuthStateChange の中で Supabase を待つと固まることがあるため、次の処理の順番に回す
    setTimeout(() => void supabase?.functions.invoke('google-token', { body: { refresh_token: refreshToken } }), 0)
  }
})

/** 診断表示のための、ログイン状態の変化の通知 */
export function watchSignIn(onChange: (record: SpikeRecord | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => onChange(session ? readSpikeRecord() : null))
  return () => data.subscription.unsubscribe()
}

export function readSpikeRecord(): SpikeRecord | null {
  const raw = localStorage.getItem(SPIKE_KEY)
  return raw ? (JSON.parse(raw) as SpikeRecord) : null
}
