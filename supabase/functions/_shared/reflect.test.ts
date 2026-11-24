import { describe, expect, it } from 'vitest'
import { buildReflectRequest, MAX_INPUT, parseReflection, ruleViolations } from './reflect.ts'

describe('parseReflection', () => {
  it('形が合っていれば、前後の空白を除いて受け取る', () => {
    expect(parseReflection({ words: ' 課題に追われた週。 ', insights: ['議論は面白かった'], carry: [' 新規事業を考える '], letGo: [] })).toEqual({
      words: '課題に追われた週。',
      insights: ['議論は面白かった'],
      carry: ['新規事業を考える'],
      letGo: [],
    })
  })

  it('形が違えば null', () => {
    expect(parseReflection(null)).toBeNull()
    expect(parseReflection({ words: 1, insights: [], carry: [], letGo: [] })).toBeNull()
    expect(parseReflection({ words: 'a', insights: 'x', carry: [], letGo: [] })).toBeNull()
    expect(parseReflection({ words: 'a', insights: [1], carry: [], letGo: [] })).toBeNull()
  })

  it('項目の数と長さに上限を付け、空の項目は捨てる', () => {
    const r = parseReflection({ words: 'a', insights: ['1', '2', '3', '4', '5', '6', ''], carry: ['x'.repeat(500)], letGo: [] })!
    expect(r.insights).toHaveLength(5)
    expect(r.carry[0]).toHaveLength(120)
  })
})

describe('buildReflectRequest', () => {
  it('話した内容を上限の長さで切って渡す', () => {
    const req = buildReflectRequest('あ'.repeat(MAX_INPUT + 100))
    expect(req.user.length).toBeLessThanOrEqual(MAX_INPUT + 20)
  })
})

describe('ruleViolations', () => {
  const base = { words: '課題に追われた週。', insights: [], carry: [], letGo: [] }

  it('決まりを守っていれば空', () => {
    expect(ruleViolations({ ...base, carry: ['新規事業のアイデアを考える'] })).toEqual([])
  })

  it('命令形、評価や励まし、点数を見つける', () => {
    expect(ruleViolations({ ...base, insights: ['もっと休みましょう'] })).toHaveLength(1)
    expect(ruleViolations({ ...base, words: '今週もよく頑張りましたね。' })).toHaveLength(1)
    expect(ruleViolations({ ...base, words: '今週は7点。' })).toHaveLength(1)
  })
})
