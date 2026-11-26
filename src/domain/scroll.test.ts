import { describe, expect, it } from 'vitest'
import { headerHidden, pupilShift, skyOffset } from './scroll'

describe('headerHidden', () => {
  it('ページの上のほうでは、いつも見せる', () => {
    expect(headerHidden(40, 10, true)).toBe(false)
  })

  it('下へ送ると隠し、上へ戻すと見せる', () => {
    expect(headerHidden(300, 200, false)).toBe(true)
    expect(headerHidden(200, 300, true)).toBe(false)
  })

  it('小さな揺れでは、いまの状態のまま', () => {
    expect(headerHidden(303, 300, true)).toBe(true)
    expect(headerHidden(297, 300, false)).toBe(false)
  })
})

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
