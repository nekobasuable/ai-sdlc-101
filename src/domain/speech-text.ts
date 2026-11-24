// マイクで聞き取った文字を、欄に今ある文字につなぐ(plan/012、spec R2)
// 聞き取りは「確定した部分」と「まだ途中の部分」に分かれて届く。どちらも、聞き取りを始めたときの文字の後ろに足す

/**
 * @param base 聞き取りを始めたときに欄にあった文字
 * @param heard 聞き取った文字(確定した部分と途中の部分をつないだもの)
 * @param separator base と heard の間に入れるもの(複数行の欄なら改行、1行の欄なら空)
 */
export function joinSpoken(base: string, heard: string, separator: string): string {
  const spoken = heard.trim()
  if (!spoken) return base
  if (!base.trim()) return spoken
  // すでに区切り(空白、改行)で終わっていれば、区切りは足さない
  return /\s$/.test(base) ? base + spoken : base + separator + spoken
}

/** 聞き取りの結果の並びから、確定した部分と途中の部分をつなぐ */
export function heardText(results: readonly { transcript: string; isFinal: boolean }[]): string {
  return results.map((r) => r.transcript).join('')
}
