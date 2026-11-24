// 話して省みる(plan/011、spec R40、R41)。AI への指示、返してほしい形、返事の確かめ方。
// 通信には触れない純粋な部分。サーバー側の関数(reflect)と評価(evals/run-reflect.ts)の両方が使う。

export type Reflection = {
  /** この週の言葉: 本人の言い回しを残した短いまとめ */
  words: string
  /** 気づいたこと */
  insights: string[]
  /** 来週に持っていきたいこと(やることの候補) */
  carry: string[]
  /** 手放してよさそうなこと */
  letGo: string[]
}

export const MAX_INPUT = 4000
const MAX_ITEMS = 5
const MAX_ITEM_CHARS = 120
const MAX_WORDS_CHARS = 300

// R41 を守らせる指示。変えたら評価(npm run eval:reflect)を回す(N7)
export const REFLECT_INSTRUCTION = `あなたは、ある人が週の終わりに話した独り言を、本人の手帳に書き写すための下書きを作ります。

守ること:
- 話していないことは書かない。推測で補わない。固有名詞や数字を足さない。
- 本人の言葉づかいをできるだけ残す。言い換えるなら、話した内容の範囲で短くまとめるだけ。
- 評価しない。点数、良い悪いの判断、励まし、ねぎらい、感想(「素晴らしい」「頑張りましたね」など)を書かない。
- 命令形や勧め(「〜してください」「〜しましょう」「〜すべき」)を書かない。
- 来週に持っていきたいことは、話の中で本人が「やりたい」「やらなきゃ」「続けたい」と言ったことだけを、短い名詞句か「〜する」の形で拾う。
- 手放してよさそうなことは、本人が「やめたい」「やらなくていい」「重い」と言ったことだけを拾う。
- 当てはまるものがなければ、その欄は空の配列にする。

書き方: 日本語。「です・ます」ではなく、手帳に書くような常体の短い文。`

/** Gemini の responseSchema の形(OpenAPI の一部) */
export const REFLECT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    words: { type: 'STRING', description: 'この週の言葉。本人の言い回しを残した1〜3文のまとめ' },
    insights: { type: 'ARRAY', items: { type: 'STRING' }, description: '気づいたこと' },
    carry: { type: 'ARRAY', items: { type: 'STRING' }, description: '来週に持っていきたいこと' },
    letGo: { type: 'ARRAY', items: { type: 'STRING' }, description: '手放してよさそうなこと' },
  },
  required: ['words', 'insights', 'carry', 'letGo'],
} as const

export type AiRequest = { system: string; user: string; schema: unknown }

export function buildReflectRequest(spoken: string): AiRequest {
  return { system: REFLECT_INSTRUCTION, user: `話した内容:\n${spoken.slice(0, MAX_INPUT)}`, schema: REFLECT_SCHEMA }
}

const clip = (text: string, max: number) => text.trim().slice(0, max)
const strings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
    ? value.map((v) => clip(v, MAX_ITEM_CHARS)).filter((v) => v.length > 0).slice(0, MAX_ITEMS)
    : null

/** AI の返事の形を確かめて整える。形が違えば null(失敗として扱う) */
export function parseReflection(raw: unknown): Reflection | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.words !== 'string') return null
  const insights = strings(r.insights)
  const carry = strings(r.carry)
  const letGo = strings(r.letGo)
  if (!insights || !carry || !letGo) return null
  return { words: clip(r.words, MAX_WORDS_CHARS), insights, carry, letGo }
}

// R41 の決まりのうち、言葉で確かめられるもの。評価(evals)で使う
const IMPERATIVE = /(してください|しましょう|すべき|しなさい|ましょう)/
const PRAISE = /(素晴らし|すばらし|頑張りました|がんばりました|えらい|偉い|よくできました|お疲れ様|おつかれさま)/
const SCORE = /(\d+\s*点|\d+\s*\/\s*10|満点)/

/** 決まりに反している箇所を返す(なければ空) */
export function ruleViolations(r: Reflection): string[] {
  const texts = [r.words, ...r.insights, ...r.carry, ...r.letGo]
  const found: string[] = []
  for (const t of texts) {
    if (IMPERATIVE.test(t)) found.push(`命令形や勧め: ${t}`)
    if (PRAISE.test(t)) found.push(`評価や励まし: ${t}`)
    if (SCORE.test(t)) found.push(`点数: ${t}`)
  }
  return found
}
