import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCKS } from './blocks'
import { owlFor } from './owl'

const morning = DEFAULT_BLOCKS.find((b) => b.id === 'morning')!
const night = DEFAULT_BLOCKS.find((b) => b.id === 'night')!

describe('owlFor', () => {
  it('夜とブロックの外では眠る', () => {
    expect(owlFor(night, true).pose).toBe('sleep')
    expect(owlFor(null, false).pose).toBe('sleep')
  })

  it('何か置いてあれば見守り、余白なら本を読む', () => {
    expect(owlFor(morning, true).pose).toBe('watch')
    expect(owlFor(morning, false).pose).toBe('read')
  })
})
