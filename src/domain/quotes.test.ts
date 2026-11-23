import { describe, expect, it } from 'vitest'
import { pickQuote, QUOTES } from './quotes'

describe('pickQuote', () => {
  it('場面に合った言葉を選ぶ', () => {
    expect(pickQuote('night', '2026-11-24').scenes).toContain('night')
    expect(pickQuote('week', '2026-11-24').scenes).toContain('week')
  })

  it('同じ日なら同じ言葉、日が変われば変わりうる', () => {
    expect(pickQuote('day', '2026-11-24')).toBe(pickQuote('day', '2026-11-24'))
    expect(pickQuote('day', '2026-11-24')).not.toBe(pickQuote('day', '2026-11-25'))
  })

  it('すべての言葉に人物と出典がある(C3)', () => {
    expect(QUOTES.every((q) => q.who && q.source)).toBe(true)
  })
})
