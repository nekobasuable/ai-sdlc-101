// AI の見立て(plan/017、spec R24〜R26 改)。AI への指示、返してほしい形、返事の確かめ方、書き込みの判定。
// 通信には触れない純粋な部分。サーバー側の関数(classify)と評価(evals/run-classify.ts)の両方が使う。
import type { AiRequest } from './reflect.ts'

/** 領域(src/domain/areas.ts と同じ。関数はリポジトリの src を読めないため、ここにも置く。一致はテストで確かめる) */
export const CLASSIFY_AREAS = [
  { id: 'work', label: '仕事' },
  { id: 'skill', label: 'スキル強化' },
  { id: 'school', label: '学校' },
  { id: 'private', label: 'プライベート' },
  { id: 'business', label: '新規ビジネス' },
] as const
export type AreaId = (typeof CLASSIFY_AREAS)[number]['id']

export type ClassifyInput = { body: string; dueDate: string | null }
export type Suggestion = { area: AreaId; important: boolean; urgent: boolean; reason: string }

export const MAX_BATCH = 30
const MAX_BODY_CHARS = 200
export const MAX_REASON_CHARS = 40

// 変えたら評価(npm run eval:classify)を回す(N7)
export const CLASSIFY_INSTRUCTION = `あなたは、ある人の手帳の「やること」に、領域と2つの問いの見立てを付けます。本人はあとで自由に直せます。

領域(area)は次のどれか1つ:
${CLASSIFY_AREAS.map((a) => `- ${a.id}: ${a.label}`).join('\n')}
目安: 勤め先の業務や会議、上司・同僚・取引先とのやりとりは work。大学院や学校の授業、課題、レポート、試験、学費や給付金などの手続きは school。資格や語学、読書など自分を伸ばす学びは skill。自分で始める事業やアイデア、起業の準備は business。買い物、家事、運動、健康、家族、友人、趣味は private。

2つの問い:
- important(大切なこと): 本人の長い目で見た目標や暮らしの土台に関わるか。迷ったら false。
- urgent(急ぐこと): 締め切り(dueDate)が今日から2日以内、または過ぎていれば true。締め切りが14日以上先、または締め切りがなければ、文面に「今日」「明日」「至急」などがない限り false。

理由(reason)は、見立ての根拠を20字ほどで。手帳に書くような常体。評価、励まし、命令形や勧め(「〜しましょう」「〜すべき」)は書かない。
入力の各項目の key をそのまま返す。`

export const CLASSIFY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          key: { type: 'STRING' },
          area: { type: 'STRING', enum: CLASSIFY_AREAS.map((a) => a.id) },
          important: { type: 'BOOLEAN' },
          urgent: { type: 'BOOLEAN' },
          reason: { type: 'STRING' },
        },
        required: ['key', 'area', 'important', 'urgent', 'reason'],
      },
    },
  },
  required: ['items'],
} as const

/** 項目には連番の key を付けて送る(データベースの id は送らない) */
export function buildClassifyRequest(items: readonly ClassifyInput[], today: string): AiRequest {
  const list = items.slice(0, MAX_BATCH).map((it, i) => ({ key: String(i + 1), body: it.body.slice(0, MAX_BODY_CHARS), dueDate: it.dueDate }))
  return { system: CLASSIFY_INSTRUCTION, user: `今日: ${today}\nやること:\n${JSON.stringify(list)}`, schema: CLASSIFY_SCHEMA }
}

const AREA_IDS = new Set<string>(CLASSIFY_AREAS.map((a) => a.id))

/** AI の返事を確かめて、key(1始まりの連番)ごとの見立てにする。形の違う項目は捨てる */
export function parseClassification(raw: unknown, count: number): Map<number, Suggestion> {
  const out = new Map<number, Suggestion>()
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as { items?: unknown }).items)) return out
  for (const entry of (raw as { items: unknown[] }).items) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    const index = Number(e.key) - 1
    if (!Number.isInteger(index) || index < 0 || index >= count || out.has(index)) continue
    if (typeof e.area !== 'string' || !AREA_IDS.has(e.area)) continue
    if (typeof e.important !== 'boolean' || typeof e.urgent !== 'boolean' || typeof e.reason !== 'string') continue
    out.set(index, { area: e.area as AreaId, important: e.important, urgent: e.urgent, reason: e.reason.trim().slice(0, MAX_REASON_CHARS) })
  }
  return out
}

/** 1 = 大切で急ぐ、2 = 大切で急がない、3 = 大切ではないが急ぐ、4 = どちらでもない(src/domain/quadrant.ts と同じ) */
export function quadrantOf({ important, urgent }: { important: boolean; urgent: boolean }): 1 | 2 | 3 | 4 {
  if (important) return urgent ? 1 : 2
  return urgent ? 3 : 4
}

export type ItemNow = { area: string | null; quadrant: number | null }
export type ItemWrite = { area?: AreaId; area_source?: 'ai'; quadrant?: 1 | 2 | 3 | 4; quadrant_source?: 'ai' }

/** 書き込む内容。本人がすでに付けた領域や象限は上書きしない(R25 改) */
export function planWrite(current: ItemNow, s: Suggestion): ItemWrite {
  const write: ItemWrite = {}
  if (current.area === null) Object.assign(write, { area: s.area, area_source: 'ai' })
  if (current.quadrant === null) Object.assign(write, { quadrant: quadrantOf(s), quadrant_source: 'ai' })
  return write
}

const IMPERATIVE = /(してください|ましょう|しなさい|すべき|しよう)/
const PRAISE = /(素晴らし|すばらし|頑張|がんば|えらい|偉い|よくでき|お疲れ|おつかれ)/

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** 決まりに反している点を返す(評価で使う)。理由の言葉づかいと、急ぐことと締め切りの食い違い */
export function ruleViolations(s: Suggestion, item: ClassifyInput, today: string): string[] {
  const found: string[] = []
  if (IMPERATIVE.test(s.reason)) found.push(`理由に命令形や勧め: ${s.reason}`)
  if (PRAISE.test(s.reason)) found.push(`理由に評価や励まし: ${s.reason}`)
  if (item.dueDate) {
    const days = daysBetween(today, item.dueDate)
    if (days <= 2 && !s.urgent) found.push(`締め切りが ${days} 日後なのに、急ぐことになっていない`)
    if (days >= 14 && s.urgent) found.push(`締め切りが ${days} 日後なのに、急ぐことになっている`)
  }
  return found
}
