import { describe, expect, it } from 'vitest'
import { contrastRatio, PALETTE } from './contrast'

describe('contrastRatio', () => {
  it('白と黒は 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it.each(['ink', 'ink2', 'ink3'] as const)('%s の文字は、紙の上で 4.5:1 以上(R46)', (name) => {
    expect(contrastRatio(PALETTE[name], PALETTE.paper)).toBeGreaterThanOrEqual(4.5)
  })
})
