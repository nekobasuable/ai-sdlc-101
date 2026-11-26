import { describe, expect, it } from 'vitest'
import { consultText, consultUrl, MAX_NOTES_IN_CONSULT } from './consult'

describe('consultText', () => {
  it('題名、締め切り、柱、メモを入れた相談の文を作る', () => {
    const text = consultText({ body: '組織行動論レポート', dueDate: '2026-11-28', notes: '第3章まで', pillar: '学び' })
    expect(text).toBe(
      ['「組織行動論レポート」(締め切り 11/28)に取りかかりたい。', '人生の柱でいうと「学び」のこと。', 'メモ: 第3章まで', 'どう進めるか、一緒に考えてほしい。'].join('\n'),
    )
  })

  it('ないものは書かない', () => {
    expect(consultText({ body: '牛乳を買う', dueDate: null, notes: ' ', pillar: null })).toBe('「牛乳を買う」に取りかかりたい。\nどう進めるか、一緒に考えてほしい。')
  })

  it('長いメモは切る', () => {
    const text = consultText({ body: 'x', dueDate: null, notes: 'あ'.repeat(MAX_NOTES_IN_CONSULT + 50), pillar: null })
    expect(text).toContain(`${'あ'.repeat(MAX_NOTES_IN_CONSULT)}…`)
    expect(text).not.toContain('あ'.repeat(MAX_NOTES_IN_CONSULT + 1))
  })
})

describe('consultUrl', () => {
  it('claude.ai の新しいチャットを、文を入れて開く', () => {
    expect(consultUrl('a b&c')).toBe('https://claude.ai/new?q=a%20b%26c')
  })
})
