import { describe, expect, it } from 'vitest'
import { previewList } from './list-preview'

const items = Array.from({ length: 10 }, (_, i) => i)

describe('previewList', () => {
  it('多いときは最初の数件だけ見せ、隠した件数を返す', () => {
    expect(previewList(items, false, 7)).toEqual({ shown: [0, 1, 2, 3, 4, 5, 6], hidden: 3 })
  })

  it('すべてを出すときは隠さない', () => {
    expect(previewList(items, true, 7)).toEqual({ shown: items, hidden: 0 })
  })

  it('数件以下なら、そのまま見せる', () => {
    expect(previewList(items.slice(0, 7), false, 7)).toEqual({ shown: items.slice(0, 7), hidden: 0 })
    expect(previewList([], false, 7)).toEqual({ shown: [], hidden: 0 })
  })
})
