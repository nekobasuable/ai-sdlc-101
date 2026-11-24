import { describe, expect, it } from 'vitest'
import { heardText, joinSpoken } from './speech-text'

describe('joinSpoken', () => {
  it('欄が空なら、聞き取った文字だけ', () => {
    expect(joinSpoken('', ' 今週は疲れた ', '\n')).toBe('今週は疲れた')
  })

  it('欄に文字があれば、区切りを挟んで後ろに足す', () => {
    expect(joinSpoken('月曜は走った。', '火曜は休んだ', '\n')).toBe('月曜は走った。\n火曜は休んだ')
    expect(joinSpoken('牛乳', 'を買う', '')).toBe('牛乳を買う')
  })

  it('欄が区切りで終わっていれば、区切りは足さない', () => {
    expect(joinSpoken('一行目\n', '二行目', '\n')).toBe('一行目\n二行目')
  })

  it('何も聞き取れなければ、欄はそのまま', () => {
    expect(joinSpoken('そのまま', '  ', '\n')).toBe('そのまま')
  })
})

describe('heardText', () => {
  it('確定した部分と途中の部分を順につなぐ', () => {
    expect(heardText([{ transcript: '今週は', isFinal: true }, { transcript: '課題が', isFinal: false }])).toBe('今週は課題が')
  })
})
