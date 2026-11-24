// AI の窓口(plan/011、spec R42)。提供元を差し替えられるよう、呼び出しはここ1か所にまとめる。
// 実行環境(Deno / Node)に依存しないよう、鍵とモデル名は呼ぶ側から受け取る。
import type { AiRequest } from './reflect.ts'

export type AiConfig = { provider: 'gemini'; apiKey: string; model: string; /** 混雑(503)や回数の上限(429)のときに呼び直す回数 */ retries?: number }

export class AiUnavailable extends Error {
  /** 混雑や回数の上限など、待てば通りうる失敗か */
  readonly retryable: boolean
  // 評価(Node の型を取り除くだけの実行)でも動くよう、引数での宣言(parameter property)は使わない
  constructor(message: string, retryable = false) {
    super(message)
    this.retryable = retryable
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 決まった形(JSON)で答えてもらう。答えは JSON として読んだもの(形の確かめは呼ぶ側) */
export async function generateJson(config: AiConfig, req: AiRequest): Promise<unknown> {
  const retries = config.retries ?? 1
  for (let attempt = 0; ; attempt++) {
    try {
      switch (config.provider) {
        case 'gemini':
          return await gemini(config, req)
      }
    } catch (e) {
      // 待てば通りうる失敗だけ、間を空けて呼び直す(plan/011 の評価で、503 と 429 が続いたため)
      if (!(e instanceof AiUnavailable) || !e.retryable || attempt >= retries) throw e
      await wait(5_000 * 2 ** attempt)
    }
  }
}

// 返事を待つ上限。過ぎたら「いまは使えない」として扱う(PR #8 のレビューの Nit)
const TIMEOUT_MS = 30_000

async function gemini(config: AiConfig, req: AiRequest): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.user }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: req.schema, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new AiUnavailable('Gemini: no response (timeout or network)')
  }
  // 429 は無料枠の回数の上限。ほかの失敗とまとめて「いまは使えない」として扱う
  if (!res.ok) throw new AiUnavailable(`Gemini: ${res.status}`, res.status === 503 || res.status === 429)
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new AiUnavailable('Gemini: empty response')
  try {
    return JSON.parse(text)
  } catch {
    throw new AiUnavailable('Gemini: response is not JSON')
  }
}
