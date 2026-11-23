import type { Block } from './blocks'

// ふくろう(spec R36、スキル life-dashboard-look)。時間帯と日付で、居場所と姿が決まる。ランダムにはしない
export type OwlPose = 'watch' | 'sleep' | 'read'
export type OwlSpot = 'heading' | 'corner' | 'aside'

const SPOTS: readonly OwlSpot[] = ['heading', 'corner', 'aside']

/** 文字列から決まる小さな数(同じ入力なら同じ結果) */
function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/**
 * @param block 今のブロック(ブロックの外の時間帯は null)
 * @param hasPlans 今のブロックに何か置いてあるか
 * @param date その日の日付(YYYY-MM-DD)
 */
export function owlFor(block: Block | null, hasPlans: boolean, date: string): { pose: OwlPose; spot: OwlSpot } {
  const pose: OwlPose = !block || block.id === 'night' ? 'sleep' : hasPlans ? 'watch' : 'read'
  const spot = SPOTS[hash(`${date}/${block?.id ?? 'none'}`) % SPOTS.length]
  return { pose, spot }
}
