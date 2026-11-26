import { describe, expect, it } from 'vitest'
import { pupilShift, skyOffset } from './scroll'

describe('skyOffset', () => {
  it('スクロール量の3割だけ遅れて動き、上限で止まる', () => {
    expect(skyOffset(100)).toBe(30)
    expect(skyOffset(1000)).toBe(120)
    expect(skyOffset(-50)).toBe(0)
  })
})

describe('pupilShift', () => {
  it('向きと速さに合わせて、上下に最大 1.5px', () => {
    expect(pupilShift(0)).toBe(0)
    expect(pupilShift(10)).toBe(0.5)
    expect(pupilShift(-10)).toBe(-0.5)
    expect(pupilShift(500)).toBe(1.5)
    expect(pupilShift(-500)).toBe(-1.5)
  })
})
