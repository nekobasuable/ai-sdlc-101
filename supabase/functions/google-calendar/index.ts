// plan/009: カレンダーの予定を、サーバーに保管した長期の鍵で読む(spec R9、plan/002 の結論)。
// 受け取るもの: { timeMin, timeMax }(ISO 8601)。返すもの: { events: [{ id, title, start, end, allDay }] }
import { createClient } from 'npm:@supabase/supabase-js@2'
import { googleAccessToken, ReconnectNeeded, signedInUser } from '../_shared/google-auth.ts'
import { corsHeaders, json } from '../_shared/http.ts'

type GoogleEvent = {
  id: string
  summary?: string
  status?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const userId = await signedInUser(admin, req)
  if (!userId) return json(req, 401, { error: 'not signed in' })

  const { timeMin, timeMax } = (await req.json().catch(() => ({}))) as { timeMin?: string; timeMax?: string }
  if (!timeMin || !timeMax || Number.isNaN(Date.parse(timeMin)) || Number.isNaN(Date.parse(timeMax))) {
    return json(req, 400, { error: 'timeMin and timeMax are required' })
  }

  try {
    const accessToken = await googleAccessToken(admin, userId)
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Calendar API: ${res.status}`)
    const body = (await res.json()) as { items?: GoogleEvent[] }
    const events = (body.items ?? [])
      .filter((e) => e.status !== 'cancelled')
      .map((e) => ({
        id: e.id,
        title: e.summary ?? '(タイトルなし)',
        start: e.start.dateTime ?? e.start.date ?? '',
        end: e.end.dateTime ?? e.end.date ?? '',
        allDay: !e.start.dateTime,
      }))
    return json(req, 200, { events })
  } catch (e) {
    if (e instanceof ReconnectNeeded) return json(req, 409, { reconnect: true })
    console.error('google-calendar の失敗', e instanceof Error ? e.message : String(e))
    return json(req, 500, { error: 'failed' })
  }
})
