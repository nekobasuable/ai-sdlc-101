import { describe, expect, it } from 'vitest'
import { DEFAULT_PILLARS } from '../../../src/domain/pillars'
import { toQuadrant } from '../../../src/domain/quadrant'
import { buildClassifyRequest, classifyInstruction, classifySchema, DEFAULT_CLASSIFY_PILLARS, MAX_BATCH, toPillars, parseClassification, planWrite, quadrantOf, ruleViolations, type Suggestion } from './classify'

const s = (over: Partial<Suggestion> = {}): Suggestion => ({ area: 'learning', important: true, urgent: false, reason: '大学院の課題', ...over })

describe('領域と象限の定義', () => {
  it('最初の6つは src/domain/pillars.ts と同じ。形が違う保存値は最初の6つに', () => {
    expect(DEFAULT_CLASSIFY_PILLARS).toEqual(DEFAULT_PILLARS)
    expect(toPillars(null)).toEqual(DEFAULT_CLASSIFY_PILLARS)
    expect(toPillars([{ id: 'x', label: '読書' }])).toEqual([{ id: 'x', label: '読書' }])
  })

  it('本人の柱を、指示と返す形に入れる(spec R4 改、plan/022)', () => {
    const pillars = [{ id: 'p-abc', label: '読書' }, ...DEFAULT_PILLARS]
    expect(classifyInstruction(pillars)).toContain('- p-abc: 読書')
    expect(classifySchema(pillars).properties.items.items.properties.area.enum).toEqual(pillars.map((p) => p.id))
  })

  it('象限の番号は src/domain/quadrant.ts と同じ', () => {
    for (const important of [true, false]) for (const urgent of [true, false]) expect(quadrantOf({ important, urgent })).toBe(toQuadrant({ important, urgent }))
  })
})

describe('buildClassifyRequest', () => {
  it('連番の key と今日の日付を渡し、データベースの id は渡さない', () => {
    const req = buildClassifyRequest([{ body: '統計のレポート', dueDate: '2026-11-28' }], '2026-11-26', DEFAULT_PILLARS)
    expect(req.user).toContain('今日: 2026-11-26')
    expect(req.user).toContain('"key":"1"')
    expect(req.user).toContain('統計のレポート')
  })

  it('一度に送るのは最大件数まで', () => {
    const many = Array.from({ length: MAX_BATCH + 5 }, (_, i) => ({ body: `項目${i}`, dueDate: null }))
    expect(buildClassifyRequest(many, '2026-11-26', DEFAULT_PILLARS).user).not.toContain(`"key":"${MAX_BATCH + 1}"`)
  })
})

const IDS = DEFAULT_PILLARS.map((p) => p.id)

describe('parseClassification', () => {
  it('key ごとの見立てにする', () => {
    const got = parseClassification({ items: [{ key: '2', area: 'work', important: false, urgent: true, reason: '会議の準備' }] }, 2, IDS)
    expect(got.get(1)).toEqual({ area: 'work', important: false, urgent: true, reason: '会議の準備' })
  })

  it('形の違うもの、本人の柱にない値、範囲外の key、重複は捨てる', () => {
    const got = parseClassification(
      {
        items: [
          { key: '1', area: 'hobby', important: true, urgent: false, reason: 'x' },
          { key: '5', area: 'work', important: true, urgent: false, reason: 'x' },
          { key: '2', area: 'work', important: 'yes', urgent: false, reason: 'x' },
          { key: '3', area: 'life', important: false, urgent: false, reason: '買い物' },
          { key: '3', area: 'work', important: true, urgent: true, reason: '重複' },
        ],
      },
      3,
      IDS,
    )
    expect([...got.keys()]).toEqual([2])
    expect(got.get(2)?.area).toBe('life')
  })

  it('理由は長すぎたら切る。形が違えば空', () => {
    const long = 'あ'.repeat(100)
    expect(parseClassification({ items: [{ key: '1', area: 'work', important: true, urgent: true, reason: long }] }, 1, IDS).get(0)?.reason).toHaveLength(40)
    expect(parseClassification(null, 1, IDS).size).toBe(0)
    expect(parseClassification({ items: 'x' }, 1, IDS).size).toBe(0)
  })
})

describe('planWrite', () => {
  it('まだ付いていないものだけを、見立てとして書く', () => {
    expect(planWrite({ area: null, quadrant: null }, s())).toEqual({ area: 'learning', area_source: 'ai', quadrant: 2, quadrant_source: 'ai' })
  })

  it('本人がすでに付けた領域や象限は上書きしない(R25 改)', () => {
    expect(planWrite({ area: 'work', quadrant: null }, s())).toEqual({ quadrant: 2, quadrant_source: 'ai' })
    expect(planWrite({ area: null, quadrant: 1 }, s())).toEqual({ area: 'learning', area_source: 'ai' })
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
