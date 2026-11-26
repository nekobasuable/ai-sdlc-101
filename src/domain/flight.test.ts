import { describe, expect, it } from 'vitest'
import { flightDuration, MAX_FLYING_CHARS, planFlight } from './flight'

describe('planFlight', () => {
  const from = { x: 100, y: 800 }
  const to = { x: 300, y: 40 }

  it('一文字ずつ、行き先までの距離を決める', () => {
    const f = planFlight('牛乳', from, to, 16)
    expect(f.map((c) => c.ch)).toEqual(['牛', '乳'])
    expect(f[0]).toMatchObject({ left: 0, dx: 200, dy: -760, delay: 0 })
    expect(f[1]).toMatchObject({ left: 16, dx: 184, dy: -760, delay: 0.05 })
  })

  it('前後の空白は飛ばさず、長い文は先頭だけ飛ばす', () => {
    expect(planFlight('  あ ', from, to, 16)).toHaveLength(1)
    expect(planFlight('あ'.repeat(40), from, to, 16)).toHaveLength(MAX_FLYING_CHARS)
  })

  it('同じ文なら同じ動き(ランダムにしない)', () => {
    expect(planFlight('統計のレポート', from, to, 16)).toEqual(planFlight('統計のレポート', from, to, 16))
  })
})

describe('flightDuration', () => {
  it('最後の文字が着くまでの時間', () => {
    expect(flightDuration(1)).toBe(1.5)
    expect(flightDuration(11)).toBeCloseTo(2.0)
  })
})
