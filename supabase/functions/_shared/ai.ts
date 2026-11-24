// AI の窓口(plan/011、spec R42)。提供元を差し替えられるよう、呼び出しはここ1か所にまとめる。
// 実行環境(Deno / Node)に依存しないよう、鍵とモデル名は呼ぶ側から受け取る。
import type { AiRequest } from './reflect.ts'

export type AiConfig = { provider: 'gemini'; apiKey: string; model: string }

export class AiUnavailable extends Error {}

/** 決まった形(JSON)で答えてもらう。答えは JSON として読んだもの(形の確かめは呼ぶ側) */
export async function generateJson(config: AiConfig, req: AiRequest): Promise<unknown> {
  switch (config.provider) {
    case 'gemini':
      return gemini(config, req)
  }
}

async function gemini(config: AiConfig, req: AiRequest): Promise<unknown> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: req.schema, temperature: 0.3 },
    }),
  })
  // 429 は無料枠の回数の上限。ほかの失敗とまとめて「いまは使えない」として扱う
  if (!res.ok) throw new AiUnavailable(`Gemini: ${res.status}`)
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new AiUnavailable('Gemini: empty response')
  try {
    return JSON.parse(text)
  } catch {
    throw new AiUnavailable('Gemini: response is not JSON')
  }
}
