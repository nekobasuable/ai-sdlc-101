import { describe, expect, it } from 'vitest'
import { decrypt, encrypt } from './crypto.ts'

// テスト用の鍵(本物ではない)。32 バイトを base64 にしたもの
const KEY_A = btoa('a'.repeat(32))
const KEY_B = btoa('b'.repeat(32))

describe('crypto', () => {
  it('暗号化して復号すると元に戻る', async () => {
    const encrypted = await encrypt('google-refresh-token-example', KEY_A)
    expect(encrypted).not.toContain('google-refresh-token-example')
    expect(await decrypt(encrypted, KEY_A)).toBe('google-refresh-token-example')
  })

  it('同じ文字列でも、暗号化するたびに結果が変わる', async () => {
    expect(await encrypt('same', KEY_A)).not.toBe(await encrypt('same', KEY_A))
  })

  it('別の鍵では復号できない', async () => {
    const encrypted = await encrypt('secret', KEY_A)
    await expect(decrypt(encrypted, KEY_B)).rejects.toThrow()
  })

  it('32 バイトでない鍵は受け付けない', async () => {
    await expect(encrypt('x', btoa('short'))).rejects.toThrow()
  })
})
