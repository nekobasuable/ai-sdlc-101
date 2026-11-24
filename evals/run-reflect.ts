// 話して省みるの評価(plan/011、プレイブック Stage 4、spec N7)。
// 例ごとに、本番と同じ指示(_shared/reflect.ts)と窓口(_shared/ai.ts)で AI を呼び、決まりを守れているかを確かめる。
// 使い方: GEMINI_API_KEY と GEMINI_MODEL を環境変数に入れて `npm run eval:reflect`
import { readFileSync, appendFileSync } from 'node:fs'
import { generateJson } from '../supabase/functions/_shared/ai.ts'
import { buildReflectRequest, parseReflection, ruleViolations } from '../supabase/functions/_shared/reflect.ts'

type Case = { id: string; input: string; carry?: string[]; carryEmpty?: boolean; letGo?: string[]; forbidden?: string[] }

const PASS_RATE = 0.8
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

for (const c of cases) {
  const problems: string[] = []
  try {
    const r = parseReflection(await generateJson({ provider: 'gemini', apiKey, model }, buildReflectRequest(c.input)))
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
    problems.push(`呼び出しの失敗: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (problems.length === 0) passed++
  lines.push(`${problems.length === 0 ? '○' : '×'} ${c.id}${problems.length ? `: ${problems.join('、')}` : ''}`)
  await new Promise((r) => setTimeout(r, WAIT_MS))
}

const rate = passed / cases.length
const summary = [`## 話して省みるの評価(${model})`, `合格 ${passed} / ${cases.length}(${Math.round(rate * 100)}%、基準 ${PASS_RATE * 100}%)`, '', ...lines.map((l) => `- ${l}`)].join('\n')
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
process.exit(rate >= PASS_RATE ? 0 : 1)
