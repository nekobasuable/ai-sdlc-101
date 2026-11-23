import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCKS } from './blocks'
import { joinLabels, restOfDay } from './rest-of-day'

describe('restOfDay', () => {
  it('今のブロックより後を、予定と余白に分ける', () => {
    const bodies = new Map([['afternoon', ['新規事業のアイデアを整理する']], ['evening', ['講義']]])
    const rest = restOfDay(DEFAULT_BLOCKS, 'morning', bodies)
    expect(rest.planned.map((p) => p.label)).toEqual(['午後', '夕方'])
    expect(rest.free).toEqual(['昼', '夜'])
  })

  it('ブロックの外の時間帯(朝より前)は、一日のすべてが対象', () => {
    expect(restOfDay(DEFAULT_BLOCKS, null, new Map()).free).toHaveLength(6)
  })
})

describe('joinLabels', () => {
  it('ブロック名を自然な文章でつなぐ', () => {
    expect(joinLabels(['夜'])).toBe('夜')
    expect(joinLabels(['昼', '夜'])).toBe('昼と夜')
    expect(joinLabels(['昼', '午後', '夜'])).toBe('昼、午後と夜')
  })
})
