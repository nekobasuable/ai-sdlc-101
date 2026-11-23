import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCKS } from './blocks'
import { owlFor } from './owl'

const morning = DEFAULT_BLOCKS.find((b) => b.id === 'morning')!
const night = DEFAULT_BLOCKS.find((b) => b.id === 'night')!

describe('owlFor', () => {
  it('夜とブロックの外では眠る', () => {
    expect(owlFor(night, true, '2026-11-24').pose).toBe('sleep')
    expect(owlFor(null, false, '2026-11-24').pose).toBe('sleep')
  })

  it('何か置いてあれば見守り、余白なら本を読む', () => {
    expect(owlFor(morning, true, '2026-11-24').pose).toBe('watch')
    expect(owlFor(morning, false, '2026-11-24').pose).toBe('read')
  })

  it('同じ日の同じ時間帯なら、いつも同じ居場所', () => {
    expect(owlFor(morning, true, '2026-11-24').spot).toBe(owlFor(morning, false, '2026-11-24').spot)
  })

  it('日が変わると、居場所も変わることがある', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-11-${String(i + 10)}`)
    const spots = new Set(dates.map((d) => owlFor(morning, true, d).spot))
    expect(spots.size).toBeGreaterThan(1)
  })
})
