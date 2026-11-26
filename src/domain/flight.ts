// 放り込んだ文字が、一文字ずつ「週」へ飛んでいく動き(plan/013)。それぞれの文字の行き先までの距離と、出発の遅れを決める
export type Point = { x: number; y: number }
export type CharFlight = { ch: string; left: number; dx: number; dy: number; rotate: number; delay: number }

/** 飛ばす文字は先頭からこの数まで(長い文は、残りを飛ばさない) */
export const MAX_FLYING_CHARS = 18
const STAGGER_S = 0.05

/**
 * @param text 放り込んだ文
 * @param from 入力欄の左端の点(画面の座標)
 * @param to 行き先(「週」の点)の画面の座標
 * @param charWidth 1文字の幅の目安(px)
 */
export function planFlight(text: string, from: Point, to: Point, charWidth: number): CharFlight[] {
  return Array.from(text.trim())
    .slice(0, MAX_FLYING_CHARS)
    .map((ch, i) => {
      const left = i * charWidth
      return {
        ch,
        left,
        dx: Math.round(to.x - (from.x + left)),
        dy: Math.round(to.y - from.y),
        // 左右に少しずつ傾ける(ランダムにはしない。同じ文なら同じ動き)
        rotate: (i % 2 === 0 ? -1 : 1) * (6 + ((i * 7) % 10)),
        delay: Number((i * STAGGER_S).toFixed(2)),
      }
    })
}

/** すべての文字が着くまでの時間(秒) */
export function flightDuration(count: number, eachSeconds = 1.5): number {
  return eachSeconds + Math.max(0, count - 1) * STAGGER_S
}
