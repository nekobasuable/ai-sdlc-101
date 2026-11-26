// AI の見立ての評価(plan/017、プレイブック Stage 4、spec N7)。
// 本番と同じ指示(_shared/classify.ts)と窓口(_shared/ai.ts)で、例をまとめて1回で AI に送り、
// 領域が合っているか、決まり(理由の言葉づかい、急ぐことと締め切り)を守れているかを確かめる。
// 使い方: GEMINI_API_KEY と GEMINI_MODEL を環境変数に入れて `npm run eval:classify`
import { appendFileSync, readFileSync } from 'node:fs'
import { AiUnavailable, generateJson } from '../supabase/functions/_shared/ai.ts'
import { buildClassifyRequest, parseClassification, ruleViolations } from '../supabase/functions/_shared/classify.ts'

type Case = { id: string; body: string; dueDate: string | null; area: string }
type Pillar = { id: string; label: string }

const AREA_RATE = 0.8

function report(summary: string): void {
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
}

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || undefined
if (!apiKey || !model) {
  const note = '評価は回っていない: GEMINI_API_KEY と GEMINI_MODEL が設定されていないため'
  console.log(`::warning::${note}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## AI の見立ての評価\n${note}\n`)
  process.exit(0)
}

// 柱の一覧も例に持たせる(本人が決める柱で見立てられるかを見る。plan/022)
const { today, cases, pillars } = JSON.parse(readFileSync(new URL('./classify/cases.json', import.meta.url), 'utf8')) as { today: string; cases: Case[]; pillars: Pillar[] }

let raw: unknown
try {
  // 無料枠の回数の上限にかからないよう、例はまとめて1回で送る(本番と同じ形)
  raw = await generateJson({ provider: 'gemini', apiKey, model, fallbackModel, retries: 3, timeoutMs: 90_000 }, buildClassifyRequest(cases, today, pillars))
} catch (e) {
  report(`## AI の見立ての評価(${model})\n評価できなかった: 呼び出しの失敗(${e instanceof AiUnavailable ? e.message : String(e)})。時間をおいて回し直す`)
  process.exit(1)
}

const got = parseClassification(raw, cases.length, pillars.map((p) => p.id))
const lines: string[] = []
let areaHits = 0
let ruleBreaks = 0
for (const [i, c] of cases.entries()) {
  const s = got.get(i)
  if (!s) {
    ruleBreaks++
    lines.push(`× ${c.id}: 見立てが返ってこなかった(形が違う)`)
    continue
  }
  const problems = ruleViolations(s, c, today)
  ruleBreaks += problems.length > 0 ? 1 : 0
  const areaOk = s.area === c.area
  if (areaOk) areaHits++
  if (!areaOk) problems.push(`領域が ${s.area}(期待は ${c.area})`)
  const mark = problems.length === 0 ? '○' : '×'
  lines.push(`${mark} ${c.id}: ${s.area}・${s.important ? '大切' : '-'}・${s.urgent ? '急ぐ' : '-'}「${s.reason}」${problems.length ? ` — ${problems.join('、')}` : ''}`)
}

const rate = areaHits / cases.length
const pass = rate >= AREA_RATE && ruleBreaks === 0
report(
  [
    `## AI の見立ての評価(${model})`,
    `領域の一致 ${areaHits} / ${cases.length}(${Math.round(rate * 100)}%、基準 ${AREA_RATE * 100}%)。決まりを破った例 ${ruleBreaks} 件(基準 0 件)。${pass ? '合格' : '不合格'}`,
    '',
    '○ 合格、× 決まりを破った、または領域が違う',
    '',
    ...lines.map((l) => `- ${l}`),
  ].join('\n'),
)
process.exit(pass ? 0 : 1)
