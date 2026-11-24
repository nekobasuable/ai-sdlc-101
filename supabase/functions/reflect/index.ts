// 話して省みる(plan/011、spec R40〜R42)。話した文章から、AI が下書きを作って返す。保存はしない。
// 受け取るもの: { text }。返すもの: { reflection } か { message }
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AiUnavailable, generateJson } from '../_shared/ai.ts'
import { signedInUser } from '../_shared/google-auth.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { buildReflectRequest, MAX_INPUT, parseReflection } from '../_shared/reflect.ts'

const UNAVAILABLE = 'いまは整えられなかった。話したことは、そのまま残せる。'
const BUSY = 'いまは混み合っていて、整えられなかった。少しおくと、また整えられる。'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  if (!(await signedInUser(admin, req))) return json(req, 401, { error: 'not signed in' })

  const { text } = (await req.json().catch(() => ({}))) as { text?: string }
  if (typeof text !== 'string' || text.trim().length === 0) return json(req, 400, { error: 'text is required' })
  if (text.length > MAX_INPUT) return json(req, 400, { error: 'text is too long' })

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMINI_MODEL')
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL') || undefined
  if (!apiKey || !model) {
    // 設定が足りないときもログに残す(どれが足りないかだけ。値は出さない。plan/012)
    console.error('reflect の設定不足', { hasApiKey: Boolean(apiKey), hasModel: Boolean(model) })
    return json(req, 200, { message: UNAVAILABLE })
  }

  try {
    const reflection = parseReflection(await generateJson({ provider: 'gemini', apiKey, model, fallbackModel, retries: 1 }, buildReflectRequest(text)))
    // 話した内容はログに出さない
    if (!reflection) {
      console.error('reflect の失敗', '返事の形が違う')
      return json(req, 200, { message: UNAVAILABLE })
    }
    return json(req, 200, { reflection })
  } catch (e) {
    console.error('reflect の失敗', e instanceof AiUnavailable ? e.message : 'unexpected')
    return json(req, 200, { message: e instanceof AiUnavailable && e.retryable ? BUSY : UNAVAILABLE })
  }
})
