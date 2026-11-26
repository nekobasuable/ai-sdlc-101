import { describe, expect, it } from 'vitest'
import { newlyFinished, resultsOf } from './finished'

const e = (placementId: string, result: string | null) => ({ placementId, result })

describe('newlyFinished', () => {
  it('同じ配置が、まだ終えていない状態から「終えた」に変わったら true', () => {
    expect(newlyFinished(resultsOf([e('a', null)]), [e('a', 'done')])).toBe(true)
    expect(newlyFinished(resultsOf([e('a', 'partial')]), [e('a', 'done')])).toBe(true)
  })

  it('開いたときの読み込み(前の結果がない)では false', () => {
    expect(newlyFinished(new Map(), [e('a', 'done'), e('b', 'done')])).toBe(false)
  })

  it('ブロックの切り替えで、終えた配置が入ってきても false', () => {
    expect(newlyFinished(resultsOf([e('a', null)]), [e('b', 'done')])).toBe(false)
  })

  it('終えたままや、終えたを取り消したときは false', () => {
    expect(newlyFinished(resultsOf([e('a', 'done')]), [e('a', 'done')])).toBe(false)
    expect(newlyFinished(resultsOf([e('a', 'done')]), [e('a', 'partial')])).toBe(false)
  })
})
