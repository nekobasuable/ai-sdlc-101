// タスクの追加(spec R1、R51、plan/025)。欄に入れた値を、保存する形に整える。
// 締め切りとメモは任意。空なら null(null のメモは Google ToDo に送らない。PR #22)

export type CaptureInput = { body: string; dueDate: string; notes: string }
export type CaptureFields = { body: string; dueDate: string | null; notes: string | null }

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** 日付の欄の値を、YYYY-MM-DD か null にする。形が違うものは付けない */
export function toDueDate(value: string): string | null {
  const v = value.trim()
  if (!DATE.test(v)) return null
  // 2026-02-30 のような、暦にない日は付けない
  const d = new Date(`${v}T00:00:00Z`)
  return d.toISOString().slice(0, 10) === v ? v : null
}

/** 題名が空なら null(追加しない) */
export function captureFields({ body, dueDate, notes }: CaptureInput): CaptureFields | null {
  const title = body.trim()
  if (!title) return null
  const memo = notes.trim()
  return { body: title, dueDate: toDueDate(dueDate), notes: memo ? memo : null }
}
