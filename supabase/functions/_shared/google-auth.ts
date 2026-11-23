// サーバー側の関数で共有する、Google の短期の鍵の取り方(plan/009)。
// 保管してある長期の鍵(暗号化済み)で短期の鍵を取る。使えなくなっていたら、つなぎ直しが必要。
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { decrypt } from './crypto.ts'

export class ReconnectNeeded extends Error {}

export async function googleAccessToken(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin.from('google_credentials').select('encrypted_refresh_token, invalid_at').eq('user_id', userId).maybeSingle()
  if (!data || data.invalid_at) throw new ReconnectNeeded()
  const refreshToken = await decrypt(data.encrypted_refresh_token, Deno.env.get('GOOGLE_TOKEN_KEY')!)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    if (body.error === 'invalid_grant') {
      await admin.from('google_credentials').update({ invalid_at: new Date().toISOString() }).eq('user_id', userId)
      throw new ReconnectNeeded()
    }
    throw new Error(`token refresh failed: ${res.status} ${body.error ?? ''}`)
  }
  return body.access_token as string
}

/** 呼び出した人を、ログインの証明(JWT)で確かめる */
export async function signedInUser(admin: SupabaseClient, req: Request): Promise<string | null> {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const { data, error } = await admin.auth.getUser(jwt)
  return error || !data.user ? null : data.user.id
}
