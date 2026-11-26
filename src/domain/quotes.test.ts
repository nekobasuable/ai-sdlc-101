import { describe, expect, it } from 'vitest'
import { pickQuote, QUOTES, type Screen } from './quotes'

const TZ = 'Asia/Tokyo'
const SCREENS: readonly Screen[] = ['now', 'week', 'review']
// 2026-11-26 から30日分の、各時間帯の真ん中の時刻(朝 8時、昼 14時、夕方 18時、夜 22時、東京)
const HOURS = [8, 14, 18, 22]
const instants = Array.from({ length: 30 }, (_, d) =>
  HOURS.map((h) => new Date(Date.UTC(2026, 10, 26 + d, h - 9))),
).flat()

describe('pickQuote', () => {
  it('夜は夜の束、それ以外は一般の束から選ぶ', () => {
    expect(pickQuote('now', new Date('2026-11-26T22:00:00+09:00'), TZ).bundle).toBe('night')
    expect(pickQuote('now', new Date('2026-11-27T01:00:00+09:00'), TZ).bundle).toBe('night')
    expect(pickQuote('now', new Date('2026-11-26T08:00:00+09:00'), TZ).bundle).toBe('general')
  })

  it('同じ時間帯のあいだは同じ言葉で、時間帯が変わると変わる', () => {
    const at = (time: string) => pickQuote('now', new Date(`2026-11-26T${time}:00+09:00`), TZ)
    expect(at('05:00')).toBe(at('10:59'))
    expect(at('11:00')).not.toBe(at('10:59'))
  })

  it.each(SCREENS)('%s の画面では、30日のあいだ同じ言葉が出ない', (screen) => {
    const shown = instants.map((t) => pickQuote(screen, t, TZ))
    expect(new Set(shown).size).toBe(shown.length)
  })

  it('同じ時刻の画面どうしでは、別の言葉が出る', () => {
    for (const t of instants) {
      const shown = SCREENS.map((s) => pickQuote(s, t, TZ))
      expect(new Set(shown).size).toBe(SCREENS.length)
    }
  })

  it('すべての言葉に人物と出典があり、本文は重ならず、50文字以内(C3)', () => {
    expect(QUOTES.every((q) => q.text && q.who && q.source)).toBe(true)
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length)
    expect(QUOTES.filter((q) => q.text.length > 50)).toEqual([])
  })
})
