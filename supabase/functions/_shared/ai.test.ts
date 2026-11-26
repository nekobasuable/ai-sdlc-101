import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiUnavailable, generateJson } from './ai.ts'

const req = { system: 's', user: 'u', schema: {} }
const ok = (body: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 })
const busy = () => new Response('', { status: 503 })

/** 呼ばれたモデル名を記録しながら、順に返事を返す fetch */
function fakeFetch(responses: Response[]) {
  const models: string[] = []
  vi.stubGlobal('fetch', (url: string) => {
    models.push(decodeURIComponent(url.split('/models/')[1].split(':')[0]))
    return Promise.resolve(responses.shift() ?? busy())
  })
  return models
}

afterEach(() => vi.unstubAllGlobals())

describe('generateJson', () => {
  const base = { provider: 'gemini' as const, apiKey: 'k', model: 'main', backoffMs: 0 }

  it('混雑したら呼び直し、通ればその答えを返す', async () => {
    const models = fakeFetch([busy(), ok({ a: 1 })])
    expect(await generateJson({ ...base, retries: 2 }, req)).toEqual({ a: 1 })
    expect(models).toEqual(['main', 'main'])
  })

  it('本命が混雑し続けたら、控えのモデルに切り替える', async () => {
    const models = fakeFetch([busy(), busy(), busy(), ok({ b: 2 })])
    expect(await generateJson({ ...base, retries: 2, fallbackModel: 'spare' }, req)).toEqual({ b: 2 })
    expect(models).toEqual(['main', 'main', 'main', 'spare'])
  })

  it('控えがなければ、混雑の失敗として知らせる', async () => {
    fakeFetch([busy(), busy(), busy()])
    await expect(generateJson({ ...base, retries: 2 }, req)).rejects.toMatchObject({ retryable: true })
  })

  it('混雑ではない失敗(400 など)は、呼び直さずに知らせる', async () => {
    const models = fakeFetch([new Response('', { status: 400 })])
    await expect(generateJson({ ...base, retries: 2, fallbackModel: 'spare' }, req)).rejects.toBeInstanceOf(AiUnavailable)
    expect(models).toEqual(['main'])
  })

  it('時間切れや通信の途切れは、控えのモデルに切り替える(PR #20)', async () => {
    const models: string[] = []
    let first = true
    vi.stubGlobal('fetch', (url: string) => {
      models.push(decodeURIComponent(url.split('/models/')[1].split(':')[0]))
      if (first) {
        first = false
        return Promise.reject(new DOMException('timed out', 'TimeoutError'))
      }
      return Promise.resolve(ok({ c: 3 }))
    })
    expect(await generateJson({ ...base, retries: 0, fallbackModel: 'spare', timeoutMs: 10 }, req)).toEqual({ c: 3 })
    expect(models).toEqual(['main', 'spare'])
  })
})
