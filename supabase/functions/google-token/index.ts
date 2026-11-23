// plan/005 段階 B: ログイン直後に受け取った Google の長期の鍵を、暗号化して保管する。
// 鍵の値はログに出さない。ブラウザには返さない。
import { createClient } from 'npm:@supabase/supabase-js@2'
import { encrypt } from '../_shared/crypto.ts'
import { corsHeaders, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData.user) return json(req, 401, { error: 'not signed in' })

  const { refresh_token: refreshToken } = (await req.json().catch(() => ({}))) as { refresh_token?: string }
  if (!refreshToken) return json(req, 400, { error: 'refresh_token is required' })

  const key = Deno.env.get('GOOGLE_TOKEN_KEY')
  if (!key) return json(req, 500, { error: 'GOOGLE_TOKEN_KEY is not set' })

  const { error } = await admin.from('google_credentials').upsert({
    user_id: userData.user.id,
    encrypted_refresh_token: await encrypt(refreshToken, key),
    invalid_at: null,
  })
  if (error) {
    console.error('google_credentials の保存に失敗', error.message)
    return json(req, 500, { error: 'failed to store' })
  }
  console.log('Google の長期の鍵を保管しました', { user_id: userData.user.id })
  return json(req, 200, { ok: true })
})
