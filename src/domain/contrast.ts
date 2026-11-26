// 文字と紙の明暗の差(WCAG のコントラスト比)。読みやすさを数で確かめる(spec R46、plan/016)
// 色の値は src/index.css の @theme と同じ。どちらかを変えたら両方を変える
export const PALETTE = {
  paper: '#f3efe7',
  ink: '#2e2a25',
  ink2: '#5a5248',
  ink3: '#6f665a',
} as const

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

/** 2つの色の明暗の差(1〜21) */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
