// 話して省みるの評価(plan/011、プレイブック Stage 4、spec N7)。
// 例ごとに、本番と同じ指示(_shared/reflect.ts)と窓口(_shared/ai.ts)で AI を呼び、決まりを守れているかを確かめる。
// 使い方: GEMINI_API_KEY と GEMINI_MODEL を環境変数に入れて `npm run eval:reflect`
import { readFileSync, appendFileSync } from 'node:fs'
import { AiUnavailable, generateJson } from '../supabase/functions/_shared/ai.ts'
import { buildReflectRequest, parseReflection, ruleViolations } from '../supabase/functions/_shared/reflect.ts'

type Case = { id: string; input: string; carry?: string[]; carryEmpty?: boolean; letGo?: string[]; forbidden?: string[] }

const PASS_RATE = 0.8
// 呼べなかった例がこれより多いと、評価として成り立たない(混雑や上限で落ちたものを、振る舞いの失敗と混ぜないため)
const MAX_UNREACHABLE = 2
const WAIT_MS = 5000 // 無料枠の回数の上限にかからないよう、間を空ける

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL
if (!apiKey || !model) {
  // キーがない(未登録、またはフォークからの PR)ときは、評価の失敗と区別するため、回っていないことをはっきり出して飛ばす(PR #8 のレビューの Nit)
  const note = '評価は回っていない: GEMINI_API_KEY と GEMINI_MODEL が設定されていないため'
  console.log(`::warning::${note}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 話して省みるの評価\n${note}\n`)
  process.exit(0)
}

const cases = JSON.parse(readFileSync(new URL('./reflect/cases.json', import.meta.url), 'utf8')) as Case[]
const lines: string[] = []
let passed = 0
let failed = 0
let unreachable = 0

for (const c of cases) {
  const problems: string[] = []
  let reached = true
  try {
    const r = parseReflection(await generateJson({ provider: 'gemini', apiKey, model, retries: 3 }, buildReflectRequest(c.input)))
    if (!r) {
      problems.push('返事の形が違う')
    } else {
      problems.push(...ruleViolations(r))
      const all = [r.words, ...r.insights, ...r.carry, ...r.letGo].join('\n')
      for (const k of c.carry ?? []) if (!r.carry.some((x) => x.includes(k))) problems.push(`来週に持っていきたいことに「${k}」がない`)
      if (c.carryEmpty && r.carry.length > 0) problems.push(`来週に持っていきたいことは空のはず: ${r.carry.join(' / ')}`)
      for (const k of c.letGo ?? []) if (!r.letGo.some((x) => x.includes(k))) problems.push(`手放してよさそうなことに「${k}」がない`)
      for (const k of c.forbidden ?? []) if (all.includes(k)) problems.push(`話していない「${k}」が入っている`)
    }
  } catch (e) {
    // 呼べなかったもの(混雑、上限、時間切れ)は、振る舞いの失敗とは分けて数える
    if (e instanceof AiUnavailable) reached = false
    problems.push(`呼び出しの失敗: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!reached) unreachable++
  else if (problems.length === 0) passed++
  else failed++
  const mark = !reached ? '-' : problems.length === 0 ? '○' : '×'
  lines.push(`${mark} ${c.id}${problems.length ? `: ${problems.join('、')}` : ''}`)
  await new Promise((r) => setTimeout(r, WAIT_MS))
}

const judged = passed + failed
const rate = judged === 0 ? 0 : passed / judged
const conclusive = unreachable <= MAX_UNREACHABLE
const verdict = !conclusive
  ? `評価できなかった: 呼べなかった例が ${unreachable} 件(上限 ${MAX_UNREACHABLE} 件)。時間をおいて回し直すか、モデルを見直す`
  : `合格 ${passed} / ${judged}(${Math.round(rate * 100)}%、基準 ${PASS_RATE * 100}%)。呼べなかった例 ${unreachable} 件`
const summary = [`## 話して省みるの評価(${model})`, verdict, '', '○ 合格、× 決まりを破った、- 呼べなかった', '', ...lines.map((l) => `- ${l}`)].join('\n')
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
process.exit(conclusive && rate >= PASS_RATE ? 0 : 1)
