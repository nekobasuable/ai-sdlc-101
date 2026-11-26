// 人生の柱(spec R4 改、plan/022)。本人が決める、時間を向けたい人生の部分。
// 項目には柱の id を付け、名前は一覧から引く(名前を変えても、付けた項目はそのまま)
export type Pillar = { id: string; label: string }

/** 最初の6つ(マイグレーション 20261127000000 の既定と同じ) */
export const DEFAULT_PILLARS: readonly Pillar[] = [
  { id: 'health', label: '健康' },
  { id: 'work', label: '仕事' },
  { id: 'learning', label: '学び' },
  { id: 'people', label: '人とのつながり' },
  { id: 'venture', label: '新規事業' },
  { id: 'life', label: '暮らし' },
]

export const MAX_PILLARS = 12
export const MAX_LABEL = 20

/** 新しい柱の id。名前からは作らない(名前を変えても id が変わらないように) */
export function newPillarId(random: () => number = Math.random): string {
  return `p-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}`
}

/** 柱の名前(見つからなければ null) */
export function pillarLabel(pillars: readonly Pillar[], id: string | null): string | null {
  if (!id) return null
  return pillars.find((p) => p.id === id)?.label ?? null
}

/** 柱の一覧を整える: 名前の前後の空白を除き、空の名前、重なった名前、多すぎる分を除く */
export function normalizePillars(pillars: readonly Pillar[]): Pillar[] {
  const seen = new Set<string>()
  const out: Pillar[] = []
  for (const p of pillars) {
    const label = p.label.trim().slice(0, MAX_LABEL)
    if (!label || seen.has(label) || out.length >= MAX_PILLARS) continue
    seen.add(label)
    out.push({ id: p.id, label })
  }
  return out
}

/** 保存された値を、柱の一覧として読む。形が違えば最初の6つ */
export function parsePillars(raw: unknown): Pillar[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PILLARS]
  const list = raw.filter((p): p is Pillar => typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.label === 'string')
  const normalized = normalizePillars(list)
  return normalized.length > 0 ? normalized : [...DEFAULT_PILLARS]
}

/**
 * 保存する前に、知らせたほうがよいことがあれば一言で返す(PR #20 のレビューの Nit)。
 * 空の名前や重なった名前は、黙って除くと、その柱が付いた項目の表示が消えるため、保存せずに知らせる
 */
export function pillarIssue(pillars: readonly Pillar[]): string | null {
  const labels = pillars.map((p) => p.label.trim())
  if (labels.some((l) => l === '')) return '名前のない柱がある。'
  const dup = labels.find((l, i) => labels.indexOf(l) !== i)
  if (dup) return `「${dup}」が二つある。どちらかの名前を変えると残せる。`
  return null
}
