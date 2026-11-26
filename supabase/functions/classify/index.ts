// AI の見立て(plan/017、spec R24〜R26 改)。ログインした本人の、まだ見立てを試みていない未仕分けのやることに、
// 領域と「大切なこと / 急ぐこと」の見立てを付ける。まとめて1回で AI に送り、本人がすでに付けたものは上書きしない。
// 受け取るもの: なし。返すもの: { suggested: 件数 }(見立てを書いた項目の数)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AiUnavailable, generateJson } from '../_shared/ai.ts'
import { buildClassifyRequest, MAX_BATCH, parseClassification, planWrite, toPillars, type Suggestion } from '../_shared/classify.ts'
import { signedInUser } from '../_shared/google-auth.ts'
import { corsHeaders, json } from '../_shared/http.ts'

/** 設定のタイムゾーンでの今日(YYYY-MM-DD) */
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const userId = await signedInUser(admin, req)
  if (!userId) return json(req, 401, { error: 'not signed in' })

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMINI_MODEL')
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL') || undefined
  if (!apiKey || !model) {
    console.error('classify の設定不足', { hasApiKey: Boolean(apiKey), hasModel: Boolean(model) })
    return json(req, 200, { suggested: 0 })
  }

  const { data: items, error } = await admin
    .from('items')
    .select('id, body, due_date, area, quadrant')
    .eq('user_id', userId)
    .in('status', ['inbox', 'candidate'])
    .is('deleted_at', null)
    .is('ai_tried_at', null)
    .or('area.is.null,quadrant.is.null')
    .order('created_at', { ascending: false })
    .limit(MAX_BATCH)
  if (error) {
    console.error('classify の読み込みの失敗', error.message)
    return json(req, 500, { error: 'read failed' })
  }
  if (!items || items.length === 0) return json(req, 200, { suggested: 0 })

  const { data: settings } = await admin.from('settings').select('time_zone, pillars').eq('user_id', userId).maybeSingle()
  const today = todayIn(settings?.time_zone ?? 'Asia/Tokyo')
  // 本人の人生の柱(plan/022)。形が違えば、最初の6つ
  const pillars = toPillars(settings?.pillars)

  let suggestions: Map<number, Suggestion>
  try {
    const raw = await generateJson(
      // まとめて送るので1回の待ち時間を長めにし、呼び直しはせず控えのモデルに1回だけ回す(最悪でも約 90 秒、Edge Functions の上限 150 秒の内側。PR #20)
      { provider: 'gemini', apiKey, model, fallbackModel, retries: 0, timeoutMs: 45_000 },
      buildClassifyRequest(items.map((it) => ({ body: it.body, dueDate: it.due_date })), today, pillars))
    suggestions = parseClassification(raw, items.length, pillars.map((p) => p.id))
  } catch (e) {
    // 混雑なら、次の同期でもう一度試す(ai_tried_at を付けない)。やることの文面はログに出さない
    console.error('classify の失敗', e instanceof AiUnavailable ? e.message : 'unexpected')
    if (e instanceof AiUnavailable && e.retryable) return json(req, 200, { suggested: 0 })
    suggestions = new Map<number, Suggestion>()
  }

  const triedAt = new Date().toISOString()
  let suggested = 0
  for (const [index, item] of items.entries()) {
    const s = suggestions.get(index)
    // 見立てが返ってこなかった項目も、試みた印を付ける(同じ項目で何度も AI を呼ばないため)
    await admin.from('items').update({ ai_tried_at: triedAt, ...(s ? { ai_reason: s.reason } : {}) }).eq('id', item.id)
    if (!s) continue
    const write = planWrite(item, s)
    // 読んでから書くまでのあいだに本人が付けたものは、上書きしない(まだ空のときだけ書く)
    if (write.area) await admin.from('items').update({ area: write.area, area_source: 'ai' }).eq('id', item.id).is('area', null)
    if (write.quadrant) await admin.from('items').update({ quadrant: write.quadrant, quadrant_source: 'ai' }).eq('id', item.id).is('quadrant', null)
    if (write.area || write.quadrant) suggested++
  }
  console.log('classify', { tried: items.length, suggested })
  return json(req, 200, { suggested })
})
