export type CalendarEvent = { id: string; title: string; start: string; end: string }

export type CalendarResult =
  | { kind: 'ok'; events: CalendarEvent[] }
  | { kind: 'expired' }
  | { kind: 'error'; status: number }

type GoogleEvent = {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

/** provider token で、主カレンダーの指定範囲の予定を読む */
export async function fetchEvents(providerToken: string, start: Date, end: Date): Promise<CalendarResult> {
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  })
  if (res.status === 401) return { kind: 'expired' }
  if (!res.ok) return { kind: 'error', status: res.status }
  const body = (await res.json()) as { items?: GoogleEvent[] }
  return {
    kind: 'ok',
    events: (body.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? '(タイトルなし)',
      start: e.start.dateTime ?? e.start.date ?? '',
      end: e.end.dateTime ?? e.end.date ?? '',
    })),
  }
}
