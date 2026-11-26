import { describe, expect, it } from 'vitest'
import { DEFAULT_PILLARS, MAX_PILLARS, newPillarId, normalizePillars, parsePillars, pillarLabel } from './pillars'

describe('pillars', () => {
  it('最初は6つ', () => {
    expect(DEFAULT_PILLARS.map((p) => p.label)).toEqual(['健康', '仕事', '学び', '人とのつながり', '新規事業', '暮らし'])
  })

  it('新しい id は名前から作らず、p- で始まる', () => {
    expect(newPillarId(() => 0.5)).toMatch(/^p-[0-9a-z]{6}$/)
  })

  it('名前を id から引く', () => {
    expect(pillarLabel(DEFAULT_PILLARS, 'health')).toBe('健康')
    expect(pillarLabel(DEFAULT_PILLARS, 'gone')).toBeNull()
    expect(pillarLabel(DEFAULT_PILLARS, null)).toBeNull()
  })

  it('空の名前、重なった名前、多すぎる分を除き、前後の空白を取る', () => {
    const many = Array.from({ length: MAX_PILLARS + 3 }, (_, i) => ({ id: `p${i}`, label: `柱${i}` }))
    expect(normalizePillars([{ id: 'a', label: ' 健康 ' }, { id: 'b', label: '' }, { id: 'c', label: '健康' }])).toEqual([{ id: 'a', label: '健康' }])
    expect(normalizePillars(many)).toHaveLength(MAX_PILLARS)
  })

  it('保存された値の形が違えば、最初の6つ', () => {
    expect(parsePillars(null)).toEqual(DEFAULT_PILLARS)
    expect(parsePillars([{ id: 1 }])).toEqual(DEFAULT_PILLARS)
    expect(parsePillars([{ id: 'x', label: '読書' }])).toEqual([{ id: 'x', label: '読書' }])
  })
})
