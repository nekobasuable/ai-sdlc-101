import { shortDate } from './due'

// 「Claude に相談」(spec R50、plan/022 C)。やることの中身から相談の文を作り、claude.ai の新しいチャットを開く URL にする。
// アプリから Claude に自動で送るものはない。開いた画面で、送るかどうかを本人が決める(C16)
export type ConsultInput = { body: string; dueDate: string | null; notes: string | null; pillar: string | null }

/** 長すぎるとき、メモを切る目安(URL が長くなりすぎないように) */
export const MAX_NOTES_IN_CONSULT = 600

export function consultText({ body, dueDate, notes, pillar }: ConsultInput): string {
  const head = `「${body.trim()}」${dueDate ? `(締め切り ${shortDate(dueDate)})` : ''}に取りかかりたい。`
  const lines = [head]
  if (pillar) lines.push(`人生の柱でいうと「${pillar}」のこと。`)
  const memo = notes?.trim()
  if (memo) lines.push(`メモ: ${memo.length > MAX_NOTES_IN_CONSULT ? `${memo.slice(0, MAX_NOTES_IN_CONSULT)}…` : memo}`)
  lines.push('どう進めるか、一緒に考えてほしい。')
  return lines.join('\n')
}

/** claude.ai の新しいチャットを、相談の文を入れた状態で開く URL */
export function consultUrl(text: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(text)}`
}
