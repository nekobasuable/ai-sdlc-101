// スクロールへの応え方(spec R43 補、plan/020)。純粋な計算だけを置き、画面の部品は src/ui/useScroll.ts から使う

/** 上の帯(日付とタブ)を隠すか。下へ送っているときは隠し、上へ戻すときと、ページの上のほうでは見せる */
export function headerHidden(y: number, lastY: number, wasHidden: boolean, threshold = 80): boolean {
  if (y < threshold) return false
  const delta = y - lastY
  // 小さな揺れでは切り替えない(指の震えで帯がちらつかないように)
  if (Math.abs(delta) < 6) return wasHidden
  return delta > 0
}

/** 空を、スクロール量の何割だけ遅らせて動かすか(奥行き)。見えなくなるあたりで止める */
export function skyOffset(y: number, rate = 0.3, max = 120): number {
  return Math.round(Math.min(Math.max(y, 0) * rate, max))
}

/** ふくろうの瞳のずれ(px)。スクロールの向きと速さ(1回の描画あたりの移動量)に合わせ、上下に最大 1.5px */
export function pupilShift(velocity: number, max = 1.5): number {
  const v = Math.max(-max, Math.min(max, velocity / 20))
  return Math.round(v * 10) / 10
}
