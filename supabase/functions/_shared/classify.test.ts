import { describe, expect, it } from 'vitest'
import { AREAS } from '../../../src/domain/areas'
import { toQuadrant } from '../../../src/domain/quadrant'
import { buildClassifyRequest, CLASSIFY_AREAS, MAX_BATCH, parseClassification, planWrite, quadrantOf, ruleViolations, type Suggestion } from './classify'

const s = (over: Partial<Suggestion> = {}): Suggestion => ({ area: 'school', important: true, urgent: false, reason: '大学院の課題', ...over })

describe('領域と象限の定義', () => {
  it('領域は src/domain/areas.ts と同じ', () => {
    expect(CLASSIFY_AREAS).toEqual(AREAS)
  })

  it('象限の番号は src/domain/quadrant.ts と同じ', () => {
    for (const important of [true, false]) for (const urgent of [true, false]) expect(quadrantOf({ important, urgent })).toBe(toQuadrant({ important, urgent }))
  })
})

describe('buildClassifyRequest', () => {
  it('連番の key と今日の日付を渡し、データベースの id は渡さない', () => {
    const req = buildClassifyRequest([{ body: '統計のレポート', dueDate: '2026-11-28' }], '2026-11-26')
    expect(req.user).toContain('今日: 2026-11-26')
    expect(req.user).toContain('"key":"1"')
    expect(req.user).toContain('統計のレポート')
  })

  it('一度に送るのは最大件数まで', () => {
    const many = Array.from({ length: MAX_BATCH + 5 }, (_, i) => ({ body: `項目${i}`, dueDate: null }))
    expect(buildClassifyRequest(many, '2026-11-26').user).not.toContain(`"key":"${MAX_BATCH + 1}"`)
  })
})

describe('parseClassification', () => {
  it('key ごとの見立てにする', () => {
    const got = parseClassification({ items: [{ key: '2', area: 'work', important: false, urgent: true, reason: '会議の準備' }] }, 2)
    expect(got.get(1)).toEqual({ area: 'work', important: false, urgent: true, reason: '会議の準備' })
  })

  it('形の違うもの、領域の外の値、範囲外の key、重複は捨てる', () => {
    const got = parseClassification(
      {
        items: [
          { key: '1', area: 'hobby', important: true, urgent: false, reason: 'x' },
          { key: '5', area: 'work', important: true, urgent: false, reason: 'x' },
          { key: '2', area: 'work', important: 'yes', urgent: false, reason: 'x' },
          { key: '3', area: 'private', important: false, urgent: false, reason: '買い物' },
          { key: '3', area: 'work', important: true, urgent: true, reason: '重複' },
        ],
      },
      3,
    )
    expect([...got.keys()]).toEqual([2])
    expect(got.get(2)?.area).toBe('private')
  })

  it('理由は長すぎたら切る。形が違えば空', () => {
    const long = 'あ'.repeat(100)
    expect(parseClassification({ items: [{ key: '1', area: 'work', important: true, urgent: true, reason: long }] }, 1).get(0)?.reason).toHaveLength(40)
    expect(parseClassification(null, 1).size).toBe(0)
    expect(parseClassification({ items: 'x' }, 1).size).toBe(0)
  })
})

describe('planWrite', () => {
  it('まだ付いていないものだけを、見立てとして書く', () => {
    expect(planWrite({ area: null, quadrant: null }, s())).toEqual({ area: 'school', area_source: 'ai', quadrant: 2, quadrant_source: 'ai' })
  })

  it('本人がすでに付けた領域や象限は上書きしない(R25 改)', () => {
    expect(planWrite({ area: 'work', quadrant: null }, s())).toEqual({ quadrant: 2, quadrant_source: 'ai' })
    expect(planWrite({ area: null, quadrant: 1 }, s())).toEqual({ area: 'school', area_source: 'ai' })
    expect(planWrite({ area: 'work', quadrant: 4 }, s())).toEqual({})
  })
})

describe('ruleViolations', () => {
  const today = '2026-11-26'
  it('命令形や励ましの理由を見つける', () => {
    expect(ruleViolations(s({ reason: '早めに出しましょう' }), { body: 'x', dueDate: null }, today)).toHaveLength(1)
    expect(ruleViolations(s({ reason: '頑張っている課題' }), { body: 'x', dueDate: null }, today)).toHaveLength(1)
    expect(ruleViolations(s(), { body: 'x', dueDate: null }, today)).toEqual([])
  })

  it('急ぐことと締め切りの食い違いを見つける', () => {
    expect(ruleViolations(s({ urgent: false }), { body: 'x', dueDate: '2026-11-27' }, today)).toHaveLength(1)
    expect(ruleViolations(s({ urgent: false }), { body: 'x', dueDate: '2026-11-20' }, today)).toHaveLength(1)
    expect(ruleViolations(s({ urgent: true }), { body: 'x', dueDate: '2026-12-31' }, today)).toHaveLength(1)
    expect(ruleViolations(s({ urgent: true }), { body: 'x', dueDate: '2026-11-28' }, today)).toEqual([])
    expect(ruleViolations(s({ urgent: false }), { body: 'x', dueDate: '2026-12-05' }, today)).toEqual([])
  })
})
